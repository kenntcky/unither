import React, { useState, useEffect, useRef } from 'react';

/**
 * ClassDataProvider
 * 
 * This component acts as a container for all data-related providers (Assignment, Subject, etc.)
 * It forces a complete remount of all child contexts when the class changes
 * by using the key prop technique.
 * 
 * @param {Object} props
 * @param {Object} props.children - Child components
 * @param {Object} props.currentClass - The current class object
 */
const ClassDataProvider = ({ children, currentClass }) => {
  // Reset key whenever class changes to force child context providers to reset
  const [resetKey, setResetKey] = useState(0);
  const prevClassId = useRef(null);
  
  useEffect(() => {
    // When class changes, force a reset of all child contexts
    if (currentClass?.id !== prevClassId.current) {
      console.log(`Class changed from ${prevClassId.current || 'none'} to ${currentClass?.id || 'none'}, forcing context reset`);
      prevClassId.current = currentClass?.id;
      // The key change will force all child contexts to remount
      setResetKey(prev => prev + 1);
    }
  }, [currentClass]);

  // Return with a key that forces complete remount when class changes
  // Using React.Fragment instead of View to avoid affecting navigation layout
  return (
    <React.Fragment key={`class-data-${resetKey}-${currentClass?.id || 'none'}`}>
      {children}
    </React.Fragment>
  );
};

export default ClassDataProvider;