// Plain types shared between server chat code and the client widget/admin
// inbox — no "server-only" import here, so client components can use it too.

export type ChatSender = "visitor" | "bot" | "staff" | "system";

/** A recommended specimen attached to a bot message — rendered as a photo card, never as a raw link in the text. */
export type ProductCard = {
  slug: string;
  name: string;
  price: number;
  image: string | null;
  url: string;
};

export type ChatMessagePayload = {
  id: string;
  sender: ChatSender;
  content: string;
  createdAt: string;
  products?: ProductCard[];
};
