import {
  $query,
  $update,
  Record,
  StableBTreeMap,
  Vec,
  match,
  Result,
  nat64,
  ic,
  Opt,
} from "azle";
import { v4 as uuidv4 } from "uuid";

type Message = Record<{
  id: string;
  title: string;
  body: string;
  attachmentURL: string;
  createdAt: nat64;
  updatedAt: Opt<nat64>;
}>;

type MessagePayload = Record<{
  title: string;
  body: string;
  attachmentURL: string;
}>;

const messageStorage = new StableBTreeMap<string, Message>(0, 44, 1024);

$query;
export function getMessages(): Result<Vec<Message>, string> {
  return Result.Ok(messageStorage.values());
}

$query;
export function getMessage(id: string): Result<Message, string> {
  return match(messageStorage.get(id), {
    Some: (message) => Result.Ok<Message, string>(message),
    None: () =>
      Result.Err<Message, string>(`Message with id=${id} not found`),
  });
}

$update;
export function addMessage(payload: MessagePayload): Result<Message, string> {
  const message: Message = {
    id: uuidv4(),
    createdAt: ic.time(),
    updatedAt: Opt.None,
    ...payload,
  };
  messageStorage.insert(message.id, message);
  return Result.Ok(message);
}

$update;
export function updateMessage(
  id: string,
  payload: MessagePayload
): Result<Message, string> {
  const existingMessage = messageStorage.get(id);
  
  if ('None' in existingMessage) {
    return Result.Err<Message, string>(`Message with id=${id} not found`);
  }

  const updatedMessage: Message = {
    ...existingMessage.Some,
    ...payload,
    updatedAt: Opt.Some(ic.time()),
  };
  messageStorage.insert(id, updatedMessage);
  return Result.Ok<Message, string>(updatedMessage);
}

$update;
export function deleteMessage(id: string): Result<Message, string> {
  const deletedMessage = messageStorage.remove(id);

  if ('None' in deletedMessage) {
    return Result.Err<Message, string>(`Message with id=${id} not found`);
  }

  return Result.Ok<Message, string>(deletedMessage.Some);
}

// a workaround to make uuid package work with Azle
globalThis.crypto = {
  // @ts-ignore
  getRandomValues: () => {
    let array = new Uint8Array(32);

    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }

    return array;
  },
};
