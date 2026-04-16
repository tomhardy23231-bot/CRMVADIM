import { NextRequest, NextResponse } from "next/server";

// GET /api/1c/contractors/list?folder=Тендера Днепр
// Пробует получить список контрагентов из 1С.
// Если 1С недоступна — возвращает пустой массив, UI не падает.
export async function GET(request: NextRequest) {
  const folder = request.nextUrl.searchParams.get("folder") || "Тендера Днепр";

  try {
    const response = await fetch(
      `http://94.130.238.102/upp2_crm_test/hs/crm/contractors?folder=${encodeURIComponent(folder)}`,
      {
        headers: {
          "x-api-key": "MySecretKey123",
          "Authorization": "Basic " + Buffer.from("admin:").toString("base64"),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      }
    );

    const text = await response.text();

    if (!response.ok) {
      console.warn("1C contractors/list error:", response.status, text.slice(0, 200));
      return NextResponse.json([]);
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.warn("1C contractors/list: JSON parse error");
      return NextResponse.json([]);
    }

    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (error: any) {
    // 1С недоступна — тихо возвращаем пустой массив
    console.warn("1C contractors/list unreachable:", String(error));
    return NextResponse.json([]);
  }
}
