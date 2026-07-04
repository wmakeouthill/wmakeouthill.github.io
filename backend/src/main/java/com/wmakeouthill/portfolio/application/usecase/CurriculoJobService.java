package com.wmakeouthill.portfolio.application.usecase;

import com.wmakeouthill.portfolio.application.dto.CurriculoJobResponse;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Executa a geração do currículo de forma assíncrona, em background.
 *
 * <p>
 * A geração faz uma chamada ao Vertex que pode passar do teto de ~58s do proxy
 * da Vercel. Em vez de bloquear a requisição (e gerar 504), iniciamos um job e
 * devolvemos o id na hora; o frontend consulta o estado por polling até o PDF
 * ficar pronto. O backend é uma instância única sempre ligada, então o store em
 * memória sobrevive entre o POST inicial e os GETs de polling.
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CurriculoJobService {

    /** Jobs concluídos/expirados são removidos depois deste tempo. */
    private static final long TTL_MS = 10 * 60 * 1000L;

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_DONE = "DONE";
    private static final String STATUS_ERROR = "ERROR";

    private final GerarCurriculoUseCase gerarCurriculoUseCase;

    private final ExecutorService executor = Executors.newFixedThreadPool(2, r -> {
        Thread t = new Thread(r, "curriculo-job");
        t.setDaemon(true);
        return t;
    });
    private final ConcurrentHashMap<String, Job> jobs = new ConcurrentHashMap<>();

    /**
     * Inicia a geração em background e devolve o id do job imediatamente.
     */
    public String iniciar(String message, String reply) {
        limparExpirados();
        String jobId = UUID.randomUUID().toString();
        jobs.put(jobId, new Job());
        String vaga = message == null ? "" : message;
        String respostaIa = reply == null ? "" : reply;
        executor.submit(() -> processar(jobId, vaga, respostaIa));
        log.info("Job de currículo iniciado: {}", jobId);
        return jobId;
    }

    private void processar(String jobId, String vaga, String respostaIa) {
        Job job = jobs.get(jobId);
        if (job == null) {
            return;
        }
        try {
            byte[] pdf = gerarCurriculoUseCase.executar(vaga, respostaIa);
            job.pdfBase64 = Base64.getEncoder().encodeToString(pdf);
            job.pdfFilename = "curriculo-wesley-personalizado.pdf";
            job.status = STATUS_DONE;
            log.info("Job de currículo concluído: {} ({} bytes)", jobId, pdf.length);
        } catch (Exception e) {
            log.error("Falha ao gerar currículo (job {})", jobId, e);
            job.error = "Não foi possível gerar o currículo agora. Tente novamente.";
            job.status = STATUS_ERROR;
        }
    }

    /**
     * Consulta o estado de um job. Jobs inexistentes/expirados retornam ERROR.
     */
    public CurriculoJobResponse consultar(String jobId) {
        limparExpirados();
        Job job = jobId == null ? null : jobs.get(jobId);
        if (job == null) {
            return new CurriculoJobResponse(jobId, STATUS_ERROR, null, null,
                    "Geração não encontrada ou expirada. Tente novamente.");
        }
        return new CurriculoJobResponse(jobId, job.status, job.pdfBase64, job.pdfFilename, job.error);
    }

    private void limparExpirados() {
        long agora = System.currentTimeMillis();
        jobs.entrySet().removeIf(entry -> agora - entry.getValue().criadoEm > TTL_MS);
    }

    @PreDestroy
    void shutdown() {
        executor.shutdownNow();
    }

    private static final class Job {
        volatile String status = STATUS_PENDING;
        volatile String pdfBase64;
        volatile String pdfFilename;
        volatile String error;
        final long criadoEm = System.currentTimeMillis();
    }
}
