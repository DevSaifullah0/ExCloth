import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';


const useNavigationSubmissionGuard =
  navigation => {
    const lockRef =
      useRef(false);

    const [
      submitting,
      setSubmitting,
    ] = useState(false);


    const resetSubmission =
      useCallback(() => {
        lockRef.current =
          false;

        setSubmitting(false);
      }, []);


    useEffect(() => {
      if (
        !navigation
          ?.addListener
      ) {
        return undefined;
      }


      return navigation.addListener(
        'focus',
        resetSubmission,
      );
    }, [
      navigation,
      resetSubmission,
    ]);


    const beginSubmission =
      useCallback(() => {
        if (lockRef.current) {
          return false;
        }


        lockRef.current =
          true;

        setSubmitting(true);

        return true;
      }, []);


    return {
      submitting,
      beginSubmission,
      resetSubmission,
    };
  };


export default useNavigationSubmissionGuard;
