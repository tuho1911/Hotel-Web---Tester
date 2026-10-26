import { useEffect, useState } from 'react';

type SignalREvent = 'newBooking' | 'userUpdated' | 'roleChanged' | 'notification';

export const useSignalR = () => {
  const [lastEvent, setLastEvent] = useState<{ type: SignalREvent; data: any } | null>(null);

  useEffect(() => {
    // Simulate SignalR connection
    console.log('SignalR: Connected to hub');

    const interval = setInterval(() => {
      // Randomly trigger events to simulate real-time updates
      const events: SignalREvent[] = ['newBooking', 'notification'];
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      
      if (Math.random() > 0.8) {
        const data = randomEvent === 'newBooking' 
          ? { id: 'BK' + Math.floor(Math.random() * 1000), guest: 'New Guest' }
          : { message: 'New system update available' };
          
        setLastEvent({ type: randomEvent, data });
        console.log(`SignalR: Received ${randomEvent}`, data);
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      console.log('SignalR: Disconnected');
    };
  }, []);

  return { lastEvent };
};
