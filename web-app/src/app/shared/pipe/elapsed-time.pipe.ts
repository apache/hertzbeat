import { Pipe, PipeTransform } from '@angular/core';
import { interval } from 'rxjs';
import { map } from 'rxjs/operators';

@Pipe({
  name: 'elapsedTime'
})
export class ElapsedTimePipe implements PipeTransform {
  transform(value: any, ...args: unknown[]): any {
    let timestamp = 0;
    if (value instanceof Date) {
      timestamp = value.getTime();
    } else if (typeof value === 'string') {
      timestamp = new Date(value).getTime();
    }

    const now = new Date().getTime();
    const diffSeconds = Math.floor((now - timestamp) / 1000); // Convert milliseconds to seconds
    const minutes = Math.floor(diffSeconds / 60); // Extract minutes
    const hours = Math.floor(minutes / 60); // Extract hours
    const days = Math.floor(hours / 24); // Extract days
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'just now';
    }
  }
}
