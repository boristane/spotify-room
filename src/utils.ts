import moment from "moment";

export function generateRandomString(length: number): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export function validateEmail(email: string): boolean {
  const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return regex.test(String(email).toLowerCase());
}

export function getDate(from: string = "", to: string = ""): { fromDate: Date, toDate: Date } {
  let fromDate = moment(0).toDate();
  let toDate = moment().toDate();
  if (from) {
    fromDate = moment(from).toDate();
  }
  if (to) {
    toDate = moment(to).toDate();
  }
  return { fromDate, toDate };
}