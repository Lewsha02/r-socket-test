const { RSocketServer } = require("rsocket-core");
const RSocketWebSocketServer = require("rsocket-websocket-server");
const { Single } = require("rsocket-flowable");
const { Flowable } = require("rsocket-flowable");

const WebSocketTransport = RSocketWebSocketServer.default;

const host = "127.0.0.1";
const port = 7000;

const transportOpts = {
  host: host,
  port: port,
};

const transport = new WebSocketTransport(transportOpts);

// Объект для хранения активных стримов
const activeStreams = {};

const requestHandler = {
  requestResponse: (payload) => {
    const request = JSON.parse(payload.data);
    console.log("Получен запрос:", request);
    return Flowable.just({
      data: JSON.stringify({ response: `Ответ на запрос: ${request.message}` }),
      metadata: "",
    });
  },

  // Обработчик подписки на получение сообщений с определенной периодичностью
  requestStream: (payload) => {
    const request = JSON.parse(payload.data);
    console.log("Получен запрос на подписку:", request);

    // Создаем поток сообщений с определенной периодичностью (здесь каждые 5 секунд)
    let index = 1;
    const messageStream = new Flowable((subscriber) => {
      const intervalId = setInterval(() => {
        if (!activeStreams[request.streamName]) {
          clearInterval(intervalId);
          subscriber.onComplete();
          return;
        }

        const message = {
          message: `Сообщение из стрима ${request.streamName} (${index})`,
          timestamp: new Date().toLocaleTimeString(),
        };
        index++;

        subscriber.onNext({
          data: JSON.stringify(message),
          metadata: "",
        });
      }, 5000);

      // Обработка отмены подписки со стороны клиента
      subscriber.onSubscribe({
        cancel: () => {
          clearInterval(intervalId);
        },
        request: (n) => {
          // Ничего не делаем, так как отправка сообщений происходит с фиксированной периодичностью
        },
      });
    });

    // Сохраняем стрим в объекте activeStreams
    activeStreams[request.streamName] = messageStream;

    // Возвращаем поток сообщений обратно клиенту
    return messageStream;
  },

  // Обработчик запроса канала для получения сообщений из указанного стрима
  requestChannel: (payloads) => {
    const streamNamePayload = payloads.find(
      (payload) => payload.metadata === ""
    );
    if (!streamNamePayload) {
      return Flowable.error(new Error("Stream name not found."));
    }
    const request = JSON.parse(streamNamePayload.data);
    console.log("Получен запрос на канал для стрима:", request.streamName);

    // Получаем стрим из activeStreams
    const messageStream = activeStreams[request.streamName];
    if (!messageStream) {
      return Flowable.error(new Error("Stream not found."));
    }

    // Возвращаем поток сообщений обратно клиенту
    return messageStream;
  },
};

const server = new RSocketServer({
  transport,
  getRequestHandler: () => requestHandler,
});

// Запускаем сервер
server.start();
console.log("RSocket сервер запущен на порту 7000");
