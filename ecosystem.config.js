module.exports = {
  apps: [
    {
      name:              'xm-api',
      script:            'apps/api/dist/main.js',
      instances:         1,
      exec_mode:         'fork',
      watch:             false,
      max_memory_restart:'500M',
      restart_delay:     3000,
      max_restarts:      10,
      env: {
        NODE_ENV: 'production',
      },
      log_file:   'logs/api-combined.log',
      error_file: 'logs/api-error.log',
      out_file:   'logs/api-out.log',
      time:       true,
    },
  ],
};
