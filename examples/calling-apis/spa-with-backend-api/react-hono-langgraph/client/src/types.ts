export interface ApiResponse {
  message: string;
  success: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  description?: string;
}

export interface Calendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
}
