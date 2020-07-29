import { Application, send } from 'https://deno.land/x/oak/mod.ts';

// Valid paths for our single page app.
const paths = [
  '/daily',
  '/monthly',
  '/editor',
  '/report',
];

const isDev = Deno.env.get('NODE_ENV') == 'development';

const app = new Application();
// For future server side handling.
// import { Router }
// const router = new Router();

// router.get('/hello', (ctx) => {
//   ctx.response.body = 'Hello World!';
// });

// app.use(router.routes());
// app.use(router.allowedMethods());

app.use(async (ctx) => {
  const path = paths.indexOf(ctx.request.url.pathname) != -1 ? '/' : ctx.request.url.pathname;
  // TODO: If isDev, inject JS into the index.html file.
  await send(ctx, path, {
    root: './build',
    index: 'index.html',
  });
});


app.use((ctx) => {
  ctx.response.body = 'not found';
});

await app.listen({ port: 8000 });
