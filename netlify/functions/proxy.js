exports.handler = async function(event) {
  const url = event.queryStringParameters && event.queryStringParameters.url;

  if (!url) {
    return { statusCode: 400, body: 'Missing url parameter' };
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch(e) {
    return { statusCode: 400, body: 'Invalid URL' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { statusCode: 403, body: 'Protocol not allowed' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MyanmarWatch/1.0; +https://myanmarwatch.com)',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { statusCode: response.status, body: `Upstream error: ${response.status}` };
    }

    const body = await response.text();
    const contentType = response.headers.get('content-type') || 'text/xml';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=180',
      },
      body,
    };

  } catch(e) {
    if (e.name === 'AbortError') {
      return { statusCode: 504, body: 'Upstream timeout' };
    }
    return { statusCode: 502, body: `Fetch error: ${e.message}` };
  }
};
