import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/vi';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.locale('vi');

/**
 * Format timestamp to Vietnam timezone (UTC+7)
 * @param dateString - ISO string or any valid date format
 * @returns Formatted string: "HH:mm:ss dd/MM/yyyy"
 */
export const formatVietnamTime = (dateString: string): string => {
  if (!dateString) return 'N/A';
  try {
    // Nếu dateString không có Z và không có offset (+xx:xx), 
    // dayjs sẽ coi đó là local time (mà backend đã gửi là VN Time).
    // Nếu có Z, nó sẽ convert sang local time của trình duyệt (VN).
    return dayjs(dateString).format('HH:mm:ss DD/MM/YYYY');
  } catch (error) {
    return 'Invalid Date';
  }
};

/**
 * Format timestamp to Vietnam timezone with short format
 * @param dateString - ISO string or any valid date format
 * @returns Formatted string: "dd/MM/yyyy HH:mm"
 */
export const formatVietnamTimeShort = (dateString: string): string => {
  if (!dateString) return 'N/A';
  try {
    return dayjs(dateString).format('DD/MM/YYYY HH:mm');
  } catch (error) {
    return 'Invalid Date';
  }
};
/**
 * Get relative time from now (e.g. "2 giờ trước")
 * @param dateString - ISO string or any valid date format
 * @returns Human friendly relative time
 */
export const formatRelativeTime = (dateString: string): string => {
  if (!dateString) return 'N/A';
  try {
    return dayjs(dateString).fromNow();
  } catch (error) {
    return 'Invalid Date';
  }
};
