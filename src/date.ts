import moment from "moment";

const TODAY = "today";
const YESTERDAY = "yesterday";

export function parseDate(dateInput: string): moment.Moment {
  switch (dateInput) {
    case TODAY:
      return moment().startOf("day");
    case YESTERDAY:
      return moment().startOf("day").subtract(1, "days");
    default:
      return moment(dateInput, "YYYY-MM-DD", true);
  }
}
