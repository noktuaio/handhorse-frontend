// Next.js output: "export" — ficheiros são <caminho>.html (ex.: /dashboard → dashboard.html,
// /dashboard/finances → dashboard/finances.html). NÃO usam <caminho>/index.html.
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.startsWith("/_next/")) {
    return request;
  }
  var path = uri.indexOf("?") >= 0 ? uri.split("?")[0] : uri;
  if (path === "/" || path === "") {
    request.uri = "/index.html";
    return request;
  }
  // Ficheiros estáticos já com extensão (.js, .css, .png, .txt, .ico, …)
  if (/\.[a-zA-Z0-9]{2,12}$/.test(path)) {
    return request;
  }
  if (path.length > 1 && path.endsWith("/")) {
    path = path.substring(0, path.length - 1);
  }
  request.uri = path + ".html";
  return request;
}
