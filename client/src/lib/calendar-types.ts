export interface CalendarDay {
  date: string;       // YYYY-MM-DD
  isAvailable: boolean;
  status: string;     // "available" | "reserved" | "blocked"
  price: number;
  minimumStay: number;
}
