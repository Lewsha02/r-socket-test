import { RSocketClient } from "rsocket-core";
import WebsocketClientTransport from "rsocket-websocket-client";

export const useWebSocket = () => {
  // Функция для создания RSocket клиента
  function createRSocketClient() {
    return new RSocketClient({
      setup: {
        keepAlive: 60000, // Интервал в миллисекундах, через который клиент отправляет keep-alive фреймы серверу для поддержания активного соединения.
        lifetime: 180000, // Максимальное время жизни соединения в миллисекундах. Если за это время клиент не получит подтверждение от сервера, соединение будет разорвано.
        dataMimeType: "application/json",
        metadataMimeType: "text/plain",
      },
      transport: new WebsocketClientTransport({
        url: "ws://127.0.0.1:7000",
      }),
    });
  }

  // Функция для установки подписки на получение сообщений от сервера по указанному стриму
  async function subscribeToStream(streamName: string) {
    const client = createRSocketClient();
    const transport = await client.connect();

    // Устанавливаем подписку на получение сообщений по указанному стриму
    const stream = await transport.requestStream({
      data: JSON.stringify({ streamName }), // Тут шлем просто название стрима и чилим
      metadata: "", // тут передаю пустую мета дату, хуй знает зачем оно надо, но пусть будет пустой пока
    });

    // Обработчик новых сообщений для данного стрима
    // Эти обработчики можно передавать как параметры в функцию сабскайба и таким образом будет еще более гибкая гибкость, но пока похуй, мне главное понять, что можно видеть разные стримы
    stream.subscribe({
      onNext: (payload: any) => {
        const message = JSON.parse(payload.data);
        console.log(`Получено сообщение из стрима ${streamName}:`, message);
      },
      onError: (error: Error) => {
        console.error(`Произошла ошибка в стриме ${streamName}:`, error);
      },
      onComplete: () => {
        console.log(`Подписка на стрим ${streamName} завершена.`);
      },
      onSubscribe: (subscription: any) => {
        subscription.request(2147483647); // Запрашиваем неограниченное количество сообщений
      },
    });
  }

  subscribeToStream("stream1");
  subscribeToStream("stream2");
};
