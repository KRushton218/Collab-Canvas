/**
 * Lock Click Logger
 * Logs and tracks when users click on locked objects
 * Includes lock owner details, timing, and request metadata
 */

/**
 * Format lock details into a readable log entry
 * @param {Object} lockData - Lock data from RTDB { lockedBy, lockedAt }
 * @param {Object} shape - The shape object being clicked
 * @param {Object} lockOwnerInfo - { displayName, color, uid }
 * @param {string} requestTime - ISO timestamp of the click request
 * @returns {Object} Formatted log entry
 */
const formatLockDetails = (lockData, shape, lockOwnerInfo, requestTime) => {
  const lockedAtTime = new Date(lockData?.lockedAt || Date.now());
  const requestDate = new Date(requestTime);
  const timeSinceLock = requestDate - lockedAtTime;
  
  return {
    timestamp: requestTime,
    requestTime: requestDate.toISOString(),
    shape: {
      id: shape?.id,
      type: shape?.type,
      x: shape?.x,
      y: shape?.y,
      width: shape?.width,
      height: shape?.height,
    },
    lock: {
      lockedBy: lockData?.lockedBy,
      lockedByUser: lockOwnerInfo?.displayName || 'Unknown User',
      lockedByColor: lockOwnerInfo?.color,
      lockedAt: lockedAtTime.toISOString(),
      timeSinceLock: `${Math.round(timeSinceLock / 1000)}s`,
      timeSinceLockMs: timeSinceLock,
    },
    request: {
      timestamp: requestDate.getTime(),
      iso: requestDate.toISOString(),
    },
  };
};

/**
 * Log a locked shape click event
 * Fetches lock details and logs comprehensive information
 * 
 * @param {Object} params
 * @param {Object} params.shape - Shape being clicked
 * @param {Object} params.locks - Lock state object
 * @param {Object} params.lockOwnerInfo - Info about lock owner { displayName, color, uid }
 * @param {string} params.eventType - Type of event ('click', 'attempt_select', etc.)
 * @returns {Object} Log entry
 */
export const logLockedShapeClick = ({
  shape,
  locks,
  lockOwnerInfo,
  eventType = 'click',
}) => {
  if (!shape?.id) {
    console.warn('[LockClickLogger] Invalid shape passed to logger');
    return null;
  }

  const lockData = locks?.[shape.id];
  if (!lockData?.lockedBy) {
    console.warn('[LockClickLogger] No lock found for shape:', shape.id);
    return null;
  }

  const requestTime = Date.now();
  const logEntry = formatLockDetails(lockData, shape, lockOwnerInfo, requestTime);

  // Log to console with nice formatting
  console.group(
    `%c🔒 LOCKED SHAPE ${eventType.toUpperCase()}`,
    'color: #ff6b6b; font-weight: bold; font-size: 12px;'
  );
  
  console.log('%cRequest Time:', 'color: #6366f1; font-weight: bold;', logEntry.request.iso);
  console.log('%cShape:', 'color: #6366f1; font-weight: bold;', logEntry.shape);
  console.log('%cLocked By:', 'color: #6366f1; font-weight: bold;', {
    user: logEntry.lock.lockedByUser,
    userId: logEntry.lock.lockedBy,
    color: logEntry.lock.lockedByColor,
  });
  console.log('%cLock Details:', 'color: #6366f1; font-weight: bold;', {
    lockedAt: logEntry.lock.lockedAt,
    timeSinceLock: logEntry.lock.timeSinceLock,
    timeSinceLockMs: logEntry.lock.timeSinceLockMs,
  });
  
  console.groupEnd();

  // Also log as JSON for potential log aggregation
  console.log('[LOCK_CLICK_EVENT]', JSON.stringify({
    eventType,
    ...logEntry,
  }));

  return logEntry;
};

/**
 * Log multiple locked shape clicks (e.g., from multi-selection)
 * @param {Array} shapeIds - IDs of shapes being clicked
 * @param {Object} shapes - Map of shape ID to shape data
 * @param {Object} locks - Lock state object
 * @param {Object} usersInfo - Map of user ID to user info { displayName, color, uid }
 * @returns {Array} Log entries
 */
export const logMultipleLockedShapeClicks = ({
  shapeIds,
  shapes,
  locks,
  usersInfo,
}) => {
  return shapeIds
    .map((shapeId) => {
      const shape = shapes?.[shapeId];
      const lockData = locks?.[shapeId];
      if (!shape || !lockData?.lockedBy) return null;

      const lockOwnerInfo = usersInfo?.[lockData.lockedBy];
      return logLockedShapeClick({
        shape,
        locks,
        lockOwnerInfo,
        eventType: 'multi_click',
      });
    })
    .filter(Boolean);
};

/**
 * Create a summary log for batch lock operations
 * Useful when multiple shapes are locked by different users
 * @param {Array} lockedShapes - Array of { shape, lockData, lockOwner }
 * @returns {Object} Summary log
 */
export const logBatchLockedShapesAttempt = (lockedShapes) => {
  if (!lockedShapes || lockedShapes.length === 0) return null;

  const summary = {
    timestamp: new Date().toISOString(),
    totalAttempted: lockedShapes.length,
    locksByUser: {},
  };

  lockedShapes.forEach(({ shape, lockData, lockOwner }) => {
    const userId = lockData?.lockedBy;
    if (!userId) return;

    if (!summary.locksByUser[userId]) {
      summary.locksByUser[userId] = {
        userName: lockOwner?.displayName || 'Unknown',
        shapeCount: 0,
        shapes: [],
      };
    }
    summary.locksByUser[userId].shapeCount++;
    summary.locksByUser[userId].shapes.push({
      id: shape?.id,
      type: shape?.type,
    });
  });

  console.group(
    '%c🔒 BATCH LOCKED SHAPES ATTEMPT',
    'color: #ff6b6b; font-weight: bold; font-size: 12px;'
  );
  console.log('%cSummary:', 'color: #6366f1; font-weight: bold;', summary);
  console.groupEnd();

  console.log('[BATCH_LOCK_CLICK_EVENT]', JSON.stringify(summary));

  return summary;
};

export default {
  logLockedShapeClick,
  logMultipleLockedShapeClicks,
  logBatchLockedShapesAttempt,
};
