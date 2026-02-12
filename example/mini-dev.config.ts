export default {
  port: 3000,
  open: true,
  label: 'EXAMPLE',
  base: '/app/',  // serve at http://localhost:3000/app/
  // proxy: { '/api': 'http://localhost:8080' },  // forward /api to your backend
  env: { prefix: 'PUBLIC_' },
};