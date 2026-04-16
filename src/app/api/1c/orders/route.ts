import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("http://94.130.238.102/upp2_crm_test/hs/crm/orders", {
      headers: {
        "x-api-key": "MySecretKey123",
        "Authorization": "Basic " + Buffer.from("admin:").toString("base64"),
      },
      cache: "no-store",
    });

    // Получаем JSON ответ от 1С
    const jsonText = await response.text();
    let data;
    try {
      data = JSON.parse(jsonText);
    } catch {
      return NextResponse.json({ error: "Ошибка парсинга JSON от 1С", raw: jsonText }, { status: 500 });
    }

    if (!response.ok) {
      return NextResponse.json({ error: "Отказ 1С", details: data }, { status: response.status });
    }

    return NextResponse.json(data);
    
  } catch (error: any) {
    return NextResponse.json({ error: "Не удалось достучаться до 1С", details: String(error) }, { status: 500 });
  }
}
