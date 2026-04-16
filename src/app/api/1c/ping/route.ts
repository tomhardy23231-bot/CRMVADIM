import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 1. Делаем запрос к нашей тестовой 1С
    // URL должен в точности совпадать с тем, что мы настроили (имя публикации + корневой URL)
    const response = await fetch("http://94.130.238.102/upp2_crm_test/hs/crm/ping", {
      headers: {
        // Передаем наш секретный ключ, который мы зашили в функцию PingGet
        "x-api-key": "MySecretKey123",
        // Вход в саму базу 1С
        "Authorization": "Basic " + Buffer.from("admin:").toString("base64"),
      },
      // Убираем кэширование, чтобы видеть реальное время
      cache: "no-store" 
    });

    // Получаем текстовый ответ от 1С (тот самый "Ура! Подключение...")
    const textData = await response.text();

    if (!response.ok) {
        // Если 1С вернула ошибку 401 (или другую) - транслируем её
      return NextResponse.json({ error: "1С ответила ошибкой", details: textData }, { status: response.status });
    }

    // Возвращаем успешный ответ на клиент CRM
    return NextResponse.json({ success: true, data: textData });
    
  } catch (error: any) {
    // Ошибка, если 1С выключена или локальный сервер упал
    return NextResponse.json({ error: "Не удалось достучаться до 1С", details: String(error) }, { status: 500 });
  }
}
