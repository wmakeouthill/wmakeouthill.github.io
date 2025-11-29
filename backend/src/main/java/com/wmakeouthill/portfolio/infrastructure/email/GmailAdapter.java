package com.wmakeouthill.portfolio.infrastructure.email;

import com.wmakeouthill.portfolio.application.dto.ContactRequest;
import com.wmakeouthill.portfolio.application.port.out.EmailPort;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class GmailAdapter implements EmailPort {
    private final JavaMailSender mailSender;

    @Value("${email.recipient:wcacorreia1995@gmail.com}")
    private String recipientEmail;

    @Value("${email.from:wcacorreia1995@gmail.com}")
    private String fromEmail;

    @Override
    public void enviarEmailContato(ContactRequest request) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(recipientEmail);
            helper.setSubject("Portfólio - Contato: " + request.subject());
            helper.setText(construirCorpoEmail(request), true);

            mailSender.send(message);
            log.info("Email de contato enviado com sucesso de {} para {}", request.email(), recipientEmail);
        } catch (MessagingException e) {
            log.error("Erro ao enviar email de contato", e);
            throw new RuntimeException("Falha ao enviar email: " + e.getMessage(), e);
        }
    }

    private String construirCorpoEmail(ContactRequest request) {
        return """
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #002E59;">Nova Mensagem do Portfólio</h2>
                <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Nome:</strong> %s</p>
                    <p><strong>Email:</strong> <a href="mailto:%s">%s</a></p>
                    <p><strong>Assunto:</strong> %s</p>
                </div>
                <div style="background-color: #ffffff; padding: 20px; border-left: 4px solid #DBC27D; margin: 20px 0;">
                    <h3 style="color: #002E59; margin-top: 0;">Mensagem:</h3>
                    <p style="white-space: pre-wrap;">%s</p>
                </div>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                <p style="color: #666; font-size: 12px;">Esta mensagem foi enviada através do formulário de contato do portfólio.</p>
            </body>
            </html>
            """.formatted(
                request.name(),
                request.email(),
                request.email(),
                request.subject(),
                request.message()
            );
    }
}

