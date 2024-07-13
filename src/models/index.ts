interface TicketDeAcceso {
  header: {
    uniqueId: number;
    generationTime: string;
    expirationTime: string;
  };
}
interface LoginCmsReturn {
  loginCmsReturn?: string;
}

export type { TicketDeAcceso, LoginCmsReturn };
