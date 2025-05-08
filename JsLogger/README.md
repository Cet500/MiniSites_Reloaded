# JS Logger - Универсальный логгер для JavaScript

## Описание

Универсальный логгер для JavaScript с поддержкой:

- 7 уровней логирования
- 6 режимов вывода
- Гибкое форматирование сообщений
- Настраиваемый формат времени
- Цветной вывод в консоль
- Полная кастомизация


## Установка

Просто скачать файл и подключить как обычный JS-скрипт.

```html
<script src="path/to/logger.js"></script>
```


## Быстрый старт

```js
const logger = new Logger({
    format: '[{level}] {module}: {message}',
    level: 'debug',
    timeFormat: 'HH:mm:SS',
    colors: true,
    mode: 'auto'
});

logger.info('App', 'Application started');
logger.success('Auth', 'User logged in successfully');
logger.error('DB', 'Error connect to DB');
```

## Возможности

### Уровни логгирования

|  Уровень | Вес |   Цвет    |  Описание                        |
|---------:|:---:|:---------:|:---------------------------------|
|    trace |  5  |   Серый   |  Детальная отладочная информация |
|    debug | 10  |   Серый   |  Отладочные сообщения            |
|     info | 20  |  Зелёный  |  Информационные сообщения        |
|  success | 25  |   Лайм    |  Успешные операции               |
|  warning | 30  |  Жёлтый   |  Предупреждения                  |
|    error | 50  | Оранжевый |  Ошибки                          |
| critical | 100 |  Красный  |  Критические ошибки              |

### Режимы работы

|     Режим |     Выходные данные      | Описание                                  |
|----------:|:------------------------:|:------------------------------------------|
|       web | console.log() - браузер  | Вывод в консоль браузера ( по умолчанию ) |
|      node | console.log() - терминал | Вывод в терминал Node.js                  |
|      auto |    Автовыбор web/node    | Автопереключение между web и node         |
|      text |      Возврат строки      | Возврат форматированной строки            |
|      html |       Возврат HTML       | Генерация и возврат HTML-разметки         |
| broadcast |      Вызов callback      | Передача данных в callback вашей функции  |


## Строение API

### Конструктор

```js
new Logger({
    format: string,      // Шаблон сообщения ( по умолчанию: '{datetime} | {level} | {module} | {message}' )
    level: string,       // Минимальный уровень логирования
    timeFormat: string,  // Формат времени ( по умолчанию: 'YYYY.MM.DD HH:mm' )
    colors: boolean,     // Включение цветов (true/false)
    mode: string         // Режим работы ('web', 'node', 'auto', 'text', 'html', 'broadcast')
});
```

### Методы логирования

```js
// module: string, message: string
   .trace( module, message )
   .debug( module, message )
    .info( module, message )
 .success( module, message )
 .warning( module, message )
   .error( module, message )
.critical( module, message )
```

### Методы настройки

```js
    .setFormat( format: string )  // Установка формата
      .setLevel( level: string )  // Установка уровня
.setTimeFormat( format: string )  // Формат времени
        .setMode( mode: string )  // Изменение режима
 .enableColors( enable:boolean )  // Управление цветами
    .onLog( callback: function )  // Обработчик, только для broadcast-режима
```
