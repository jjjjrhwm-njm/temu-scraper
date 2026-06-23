// التحديث النهائي: الربط مع محرك السحب الخاص بنا على Render 🚀
addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
    "Access-Control-Max-Age": "86400",
  };

  // التعامل مع طلبات الفحص المسبق (CORS)
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
    // 🔗 هذا هو رابط سيرفرك الخاص الذي صنعناه للتو على رندر!
    const myEngineUrl = `https://temu-markt.onrender.com/scrape?url=${encodeURIComponent(targetUrl)}`;

    // إرسال الرابط إلى محركك ليقوم بفتح المتصفح المخفي وجلب البيانات
    const response = await fetch(myEngineUrl);
    const data = await response.json();

    // إرجاع النتيجة الصافية إلى البوت
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: "فشل الاتصال بالمحرك الخاص: " + error.message }), { 
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  }
}
