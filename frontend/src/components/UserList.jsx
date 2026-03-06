import './UserList.css';

const UserList = ({ users, currentUserId, onCallUser, myCallStatus }) => {
  const otherUsers = users.filter((u) => u._id !== currentUserId);

  if (otherUsers.length === 0) {
    return (
      <div className="user-list-empty">
        <div className="empty-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="20" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M10 40c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        </div>
        <p>No other users online</p>
        <span>Ask your colleagues to sign in</span>
      </div>
    );
  }

  return (
    <div className="user-list">
      <div className="user-list-header">
        <h3>Online Users</h3>
        <span className="user-count">{otherUsers.length}</span>
      </div>

      <div className="user-list-items">
        {otherUsers.map((user) => (
          <div key={user._id} className="user-item">
            <div className="user-avatar">
              <span>{user.name.charAt(0).toUpperCase()}</span>
              <div className={`status-dot ${user.inCall ? 'busy' : 'online'}`} />
            </div>

            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-status-text">
                {user.inCall ? 'In a call' : 'Available'}
              </span>
            </div>

            <button
              className={`call-btn ${user.inCall ? 'disabled' : ''}`}
              onClick={() => onCallUser(user)}
              disabled={user.inCall || myCallStatus !== 'idle'}
              title={
                user.inCall
                  ? 'User is in a call'
                  : myCallStatus !== 'idle'
                  ? 'You are already in a call'
                  : `Call ${user.name}`
              }
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserList;
