addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
    "Access-Control-Max-Age": "86400",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(request.url);
  let targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "الرجاء توفير رابط المنتج في المعلمة 'url'" }), { 
      status: 400, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
      }
    });

    const html = await response.text();

    let titleMatch = html.match(/<title>([^<]+)<\/title>/i) || html.match(/property="og:title"\s+content="([^"]+)"/i);
    let title = titleMatch ? titleMatch[1].trim() : "منتج جديد مسحوب";

    let images = [];
    let imgRegexes = [
        /"goodsImage"\s*:\s*"([^"]+)"/gi,
        /"carouselImages"\s*:\s*\[([\s\S]*?)\]/i,
        /property="og:image"\s+content="([^"]+)"/i
    ];

    imgRegexes.forEach(regex => {
        let match;
        while ((match = regex.exec(html)) !== null) {
            let foundStr = match[1];
            if (foundStr.startsWith('http')) {
                if (!images.includes(foundStr)) images.push(foundStr);
            } else if (foundStr.includes('"')) {
                let arrUrls = foundStr.match(/"([^"]+)"/g);
                if (arrUrls) {
                    arrUrls.forEach(u => {
                        let cleanUrl = u.replace(/"/g, '');
                        if (cleanUrl.startsWith('http') && !images.includes(cleanUrl)) images.push(cleanUrl);
                    });
                }
            }
        }
    });

    images = images.filter(img => {
        let lower = img.toLowerCase();
        return !lower.includes('logo') && !lower.includes('icon') && !lower.includes('avatar') && !lower.includes('svg');
    }).slice(0, 5); 

    let originalPrice = 0;
    let minPriceRegex = /"minPrice"?\s*:\s*"?(\d+(\.\d+)?)"?/g;
    let priceRegex = /"price"?\s*:\s*"?(\d+(\.\d+)?)"?/g;
    let amountRegex = /"amount"?\s*:\s*"?(\d+(\.\d+)?)"?/g;

    let match;
    if ((match = minPriceRegex.exec(html)) !== null) { originalPrice = parseFloat(match[1]); }
    else if ((match = priceRegex.exec(html)) !== null) { originalPrice = parseFloat(match[1]); }
    else if ((match = amountRegex.exec(html)) !== null) { originalPrice = parseFloat(match[1]); }

    if (originalPrice === 0) {
       let metaPrice = html.match(/property="product:price:amount"\s+content="([^"]+)"/i) || html.match(/property="og:price:amount"\s+content="([^"]+)"/i);
       if (metaPrice) originalPrice = parseFloat(metaPrice[1].replace(/[^0-9.]/g, ''));
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        title: title,
        price: originalPrice,
        images: images,
        originalUrl: targetUrl
      }
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  }
}
