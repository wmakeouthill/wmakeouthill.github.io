package com.wmakeouthill.portfolio.infrastructure.ssr;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadFactory;

/**
 * Infraestrutura assíncrona do edge SSR: um pool pequeno e dedicado para
 * revalidações em background (stale-while-revalidate) e warmup, isolado das
 * threads de request do Tomcat.
 */
@Configuration
public class SsrConfig {

  public static final String EXECUTOR_REVALIDACAO = "ssrRevalidacaoExecutor";

  @Bean(name = EXECUTOR_REVALIDACAO)
  public Executor ssrRevalidacaoExecutor() {
    ThreadFactory factory = runnable -> {
      Thread thread = new Thread(runnable, "ssr-revalidacao");
      thread.setDaemon(true);
      return thread;
    };
    return Executors.newFixedThreadPool(2, factory);
  }
}
