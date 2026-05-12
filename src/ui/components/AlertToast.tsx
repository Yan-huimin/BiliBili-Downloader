import { AnimatePresence, motion } from 'framer-motion';
import { FaInfoCircle } from 'react-icons/fa';

type AlertToastProps = {
  message: string;
  visible: boolean;
};

function AlertToast({ message, visible }: AlertToastProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="alert-toast"
          data-testid="warning"
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <FaInfoCircle aria-hidden="true" className="alert-toast__icon" />
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AlertToast;
