export type ConditionalTrade = {
  /**
   * A unique identifier for the trade
   */
  tradeID: string;

  /**
   * The user ID of the user who created the conditional trade
   */
  userID: string;

  /**
   * The user ID of the user who created the conditional trade
   */
  email: string;

  /**
   * The stock ticker to trade
   */
  ticker: string;

  /**
   * The quantity of shares to trade
   */
  qty: number;

  /**
   * The condition that triggers the trade
   */
  condition: {
    metric: "PE" | "P/S" | "P/B" | "P/FCF" | "P/EBITDA";
    threshold: number;
    operator: ">" | "<" | ">=" | "<=" | "==";
  };
};
