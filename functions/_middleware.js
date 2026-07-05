// noinspection JSUnusedGlobalSymbols
export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  const targetDomain = 'drums.king-tajin.dev';

  if (url.hostname.endsWith('.pages.dev')) {
    url.hostname = targetDomain;
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
}
