// التحديث النهائي: استخدام ScraperAPI لكسر حماية تيمو 🚀
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
    return new Response(JSON.stringify({ error: "الرجاء توفير الرابط" }), { 
      status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  }

  try {
    // مفتاح ScraperAPI الخاص بك
    const API_KEY = "045f9b4dd95182b3c09868dca52e3f79";
    
    // إعداد الرابط (أضفنا render=true ليقوم بفتح متصفح حقيقي مخفي)
    const scraperUrl = `http://api.scraperapi.com?api_key=${API_KEY}&url=${encodeURIComponent(targetUrl)}&render=true`;

    const response = await fetch(scraperUrl);
    const html = await response.text();

    // --- محرك سحب البيانات ---
    
    // سحب وتنظيف الاسم
    let titleMatch = html.match(/<title>([^<]+)<\/title>/i) || html.match(/property="og:title"\s+content="([^"]+)"/i);
    let title = titleMatch ? titleMatch[1].trim() : "منتج جديد مسحوب";
    title = title.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&'); 

    // سحب الصور
    let images = [];
    let imgRegexes = [
        /"goodsImage"\s*:\s*"([^"]+)"/gi,
        /"thumbUrl"\s*:\s*"([^"]+)"/gi,
        /"carouselImages"\s*:\s*\[([\s\S]*?)\]/gi,
        /property="og:image"\s+content="([^"]+)"/gi
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

    // سحب السعر
    let originalPrice = 0;
    let minPriceRegex = /"minPrice"?\s*:\s*"?(\d+(\.\d+)?)"?/g;
    let priceRegex = /"price"?\s*:\s*"?(\d+(\.\d+)?)"?/g;
    let amountRegex = /"amount"?\s*:\s*"?(\d+(\.\d+)?)"?/g;

    let match2;
    if ((match2 = minPriceRegex.exec(html)) !== null) { originalPrice = parseFloat(match2[1]); }
    else if ((match2 = priceRegex.exec(html)) !== null) { originalPrice = parseFloat(match2[1]); }
    else if ((match2 = amountRegex.exec(html)) !== null) { originalPrice = parseFloat(match2[1]); }

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
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  }
}
