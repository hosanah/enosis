import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Service to monitor user inactivity and emit an event after a specified timeout
 */
@Injectable({ providedIn: 'root' })
export class IdleService {
  private timeoutId: any = null;
  private timeout = 0;
  private readonly activityEvents = ['mousemove', 'keydown', 'click', 'touchstart'];
  private readonly activityHandler = () => this.resetTimer();

  private timeoutSubject = new Subject<void>();
  /** Observable fired when inactivity timeout is reached */
  timeout$ = this.timeoutSubject.asObservable();

  /** Start monitoring user activity with the provided timeout (ms) */
  start(timeout: number): void {
    this.stop();
    this.timeout = timeout;
    this.activityEvents.forEach(e =>
      document.addEventListener(e, this.activityHandler)
    );
    this.resetTimer();
  }

  /** Stop monitoring user activity */
  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.activityEvents.forEach(e =>
      document.removeEventListener(e, this.activityHandler)
    );
  }

  /** Reset the inactivity timer */
  private resetTimer(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      this.timeoutSubject.next();
    }, this.timeout);
  }
}

