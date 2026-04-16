import { NextRequest, NextResponse } from "next/server";

// GET /api/1c/contractor/search?name=Тендер 5 столов
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");

  if (!name) {
    return NextResponse.json({ error: "Параметр 'name' обязателен (введите название тендера)" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `http://94.130.238.102/upp2_crm_test/hs/crm/contractor?name=${encodeURIComponent(name)}`,
      {
        headers: {
          "x-api-key": "MySecretKey123",
          "Authorization": "Basic " + Buffer.from("admin:").toString("base64"),
        },
        cache: "no-store",
      }
    );

    const text = await response.text();

    // Если 1С вернула не 200 ОК (например, 404 если не найдено)
    if (!response.ok) {
      return NextResponse.json({ error: "Ошибка 1С", details: text }, { status: response.status });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Ошибка парсинга JSON", raw: text }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: "Не удалось достучаться до 1С", details: String(error) }, { status: 500 });
  }
}
