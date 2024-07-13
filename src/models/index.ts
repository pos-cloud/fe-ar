interface TicketDeAcceso {
  header: {
    uniqueId: number;
    generationTime: string;
    expirationTime: string;
  };
}

export type { TicketDeAcceso };
