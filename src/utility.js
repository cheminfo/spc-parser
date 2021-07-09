/**
 * Gets the parameter in each bit of the flag
 * @param {number} flag First byte of the main header
 * @returns {object} The parameters
 */
export function getFlagParameters(flag) {
  const parameters = {};
  parameters.y16BitPrecision = (flag & 2) !== 0;
  parameters.useExperimentExtension = (flag & 2) !== 0;
  parameters.multiFile = (flag & 4) !== 0;
  parameters.zValuesRandom = (flag & 8) !== 0;
  parameters.zValuesUneven = (flag & 16) !== 0;
  parameters.customAxisLabels = (flag & 32) !== 0;
  parameters.xyxy = (flag & 64) !== 0;
  parameters.xy = (flag & 128) !== 0;
  return parameters;
}
/**
 *
 * Date with leap years compatibility and ISO 8601:2019 format
 * @class Date
 */
class Date {
  constructor() {
    this.year = 0;
    this.month = 0;
    this.day = 0;
    this.hour = 0;
    this.minutes = 0;
  }

  setYear(year) {
    this.year = year;
    if (this.month === 2) {
      if (
        (year % 4 === 0 &&
          (year % 100 !== 0 || year % 400 === 0) &&
          this.day > 29) ||
        this.day >= 29
      ) {
        this.day = 0;
      }
    }
  }
  setMonth(month) {
    if (month < 12 && month > 0) {
      this.month = month;
    }
    if (this.day !== 0) {
      switch (this.month) {
        case 1 || 3 || 5 || 7 || 8 || 10 || 12:
          if (month > 31) {
            this.day = 0;
          }
          break;
        case 4 || 6 || 9 || 11:
          if (month >= 31) {
            this.day = 0;
          }
          break;
        case 2:
          if (
            (this.year % 4 === 0 &&
              (this.year % 100 !== 0 || this.year % 400 === 0) &&
              this.day > 29) ||
            this.day >= 29
          ) {
            this.day = 0;
          }
          break;
        default:
          break;
      }
    }
  }
  setDay(day) {
    if (day > 0) {
      switch (this.month) {
        case 1 || 3 || 5 || 7 || 8 || 10 || 12:
          if (day <= 31) {
            this.day = day;
          }
          break;
        case 4 || 6 || 9 || 11:
          if (day < 31) {
            this.day = day;
          }
          break;
        case 2:
          if (
            (this.year % 4 === 0 &&
              (this.year % 100 !== 0 || this.year % 400 === 0) &&
              this.day <= 29) ||
            this.day < 29
          ) {
            this.day = day;
          }
          break;
        default:
          this.day = day < 32 ? day : this.day;
          break;
      }
    }
  }
  setHour(hour) {
    if (hour <= 24 && hour >= 0) {
      this.hour = hour;
    }
  }
  setMinutes(minutes) {
    if (minutes < 60 && minutes >= 0) {
      this.minutes = minutes;
    }
  }
  toISOString() {
    return `${
      this.year <= 9999 && this.year >= 0 ? '' : this.year > 0 ? '+' : '-'
    }${this.year}-${this.month < 10 ? 0 : ''}${this.month}-${
      this.day < 10 ? 0 : ''
    }${this.day}T${this.hour < 10 ? 0 : ''}${this.hour}-${
      this.minutes < 10 ? 0 : ''
    }${this.minutes}`;
  }
  toJson() {
    return {
      year: this.year,
      month: this.month,
      day: this.day,
      hour: this.hour,
      minutes: this.minutes,
    };
  }
}
//OH MY GOD THERE'S ALREADY A DATE CLASS IN JAVASCRIPT

/**
 * Gets the date encoded in binary in a long number
 * @param {number} long Binary date
 * @return {string} Date formatted to ISO 8601:2019 convention
 */
export function longToDate(long) {
  const date = new Date();
  date.setYear(Math.floor(long % 4096)); //12 LSBs
  date.setMonth(Math.floor((long /= Math.pow(2, 12)) % 16)); //4 next bits
  date.setDay(Math.floor((long /= Math.pow(2, 4)) % 32)); //5 next bits
  date.setHour(Math.floor((long /= Math.pow(2, 5)) % 32)); //5 next bits
  date.setMinutes(Math.floor((long /= Math.pow(2, 5)) % 64)); //6 MSBs
  return date.toISOString();
}
