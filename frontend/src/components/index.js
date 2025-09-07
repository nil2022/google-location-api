import { useEffect } from 'react';

const useGeolocation = () => {
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        console.log(position);
      }, (error) => {
        console.log(error);
      });
    }
  }, []);
};

export default useGeolocation;