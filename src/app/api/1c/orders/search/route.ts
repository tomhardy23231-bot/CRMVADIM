import { NextRequest, NextResponse } from "next/server";

// GET /api/1c/orders/search?number=ЭИ000002046
// Ищет один заказ в 1С по его номеру и возвращает его данные
export async function GET(request: NextRequest) {
  const number = request.nextUrl.searchParams.get("number");

  if (!number) {
    return NextResponse.json({ error: "Параметр 'number' обязателен" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `http://94.130.238.102/upp2_crm_test/hs/crm/orders?number=${encodeURIComponent(number)}`,
      {
        headers: {
          "x-api-key": "MySecretKey123",
          "Authorization": "Basic " + Buffer.from("admin:").toString("base64"),
        },
        cache: "no-store",
      }
    );

    const text = await response.text();

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
