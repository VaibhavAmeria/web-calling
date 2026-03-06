import './CallModal.css';

const CallModal = ({ callerName, onAccept, onReject }) => {
  return (
    <div className="call-modal-overlay">
      <div className="call-modal">
        <div className="call-modal-ring">
          <div className="ring-pulse ring-1"></div>
          <div className="ring-pulse ring-2"></div>
          <div className="ring-pulse ring-3"></div>
          <div className="caller-avatar">
            <span>{callerName?.charAt(0).toUpperCase()}</span>
          </div>
        </div>

        <div className="call-modal-info">
          <h2>Incoming Call</h2>
          <p className="caller-name">{callerName}</p>
          <p className="call-type">Voice Call</p>
        </div>

        <div className="call-modal-actions">
          <button className="modal-btn reject-btn" onClick={onReject}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
            </svg>
            <span>Decline</span>
          </button>

          <button className="modal-btn accept-btn" onClick={onAccept}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
            </svg>
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallModal;
