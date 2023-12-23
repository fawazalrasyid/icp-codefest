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

// Define the Message record type
type Message = Record<{
  id: string;
  title: string;
  body: string;
  attachmentURL: string;
  createdAt: nat64;
  updatedAt: Opt<nat64>;
}>;

// Define the Payload type for creating/updating a Message
type MessagePayload = Record<{
  title: string;
  body: string;
  attachmentURL: string;
}>;

// Create a StableBTreeMap to store message data
const messageStorage = new StableBTreeMap<string, Message>(0, 44, 1024);

$query;
export function getMessages(): Result<Vec<Message>, string> {
  try {
    // Retrieve all messages
    return Result.Ok(messageStorage.values());
  } catch (error) {
    return Result.Err<Vec<Message>, string>(`Error retrieving messages: ${error}`);
  }
}

$query;
export function getMessage(id: string): Result<Message, string> {
  try {
    // Validation ID:
  if (!id) {
    return Result.Err<Message, string>("Invalid ID");
  }

    // Retrieve message by ID
    const messageData = messageStorage.get(id);

    return match(messageData, {
      Some: (message) => Result.Ok<Message, string>(message),
      None: () => Result.Err<Message, string>(`Message with id=${id} not found`),
    });
  } catch (error) {
    return Result.Err<Message, string>(`Error retrieving message: ${error}`);
  }
}

$update;
export function addMessage(payload: MessagePayload): Result<Message, string> {
  // Payload Validation: Ensure that all data is present in the payload
  if (!payload.title || !payload.body || !payload.attachmentURL) {
    return Result.Err<Message, string>("All data must be added");
  }

  try {
    // Create a new message record
    const newMessage: Message = {
      id: uuidv4(),
      createdAt: ic.time(),
      updatedAt: Opt.None,
      title: payload.title,
      body: payload.body,
      attachmentURL: payload.attachmentURL
  
    };

    // Insert the new message into the database
    messageStorage.insert(newMessage.id, newMessage);

    return Result.Ok(newMessage);
  } catch (error) {
    return Result.Err<Message, string>(`Failed to add message: ${error}`);
  }
}

$update;
export function updateMessage(
  id: string,
  payload: MessagePayload
): Result<Message, string> {
   // Validation ID:
   if (!id) {
    return Result.Err<Message, string>("Invalid ID");
  }
  // Payload Validation: Ensure that all data is present in the payload
  if (!payload.title || !payload.body || !payload.attachmentURL) {
    return Result.Err<Message, string>("All data must be added");
  }

  try {
    // Match message data by ID
    return match(messageStorage.get(id), {
      Some: (message) => {
        // Payload Validation: Ensure that at least one field is present in the payload
        if (!payload.title && !payload.body && !payload.attachmentURL) {
          return Result.Err<Message, string>("At least one field must be updated");
        }

        // Create an updated message record
        const updatedMessage: Message = {
          ...message,
          ...payload,
          updatedAt: Opt.Some(ic.time()),
        };

        // Update the message in the database
        messageStorage.insert(message.id, updatedMessage);

        return Result.Ok<Message, string>(updatedMessage);
      },
      None: () =>
        Result.Err<Message, string>(
          `Message with id=${id} not found. Couldn't update.`
        ),
    });
  } catch (error) {
    return Result.Err<Message, string>(`Error updating message: ${error}`);
  }
}

$update;
export function deleteMessage(id: string): Result<Message, string> {
  try {
    // Validation ID:
   if (!id) {
    return Result.Err<Message, string>("Invalid ID");
  }
    // Remove message by ID
    return match(messageStorage.remove(id), {
      Some: (deletedMessage) => Result.Ok<Message, string>(deletedMessage),
      None: () =>
        Result.Err<Message, string>(
          `Message with id=${id} not found. Couldn't delete.`
        ),
    });
  } catch (error) {
    return Result.Err<Message, string>(`Error deleting message: ${error}`);
  }
}

// A workaround to make the uuid package work with Azle
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
