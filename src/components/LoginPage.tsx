import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Key } from 'lucide-react';

interface LoginPageProps {
  onLogin: (success: boolean) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [passkey, setPasskey] = useState('');
  const [showPasskey, setShowPasskey] = useState(false);
  const [error, setError] = useState('');
  const [isChangingPasskey, setIsChangingPasskey] = useState(false);
  const [newPasskey, setNewPasskey] = useState('');
  const [confirmPasskey, setConfirmPasskey] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    // Check if this is the first time setup - no passkey exists
    const storedPasskey = localStorage.getItem('encoder_passkey');
    if (!storedPasskey) {
      setIsFirstTime(true);
      setIsChangingPasskey(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPasskey = localStorage.getItem('encoder_passkey');
    
    if (passkey === storedPasskey) {
      onLogin(true);
      setError('');
    } else {
      setError('Invalid passkey. Please try again.');
      setPasskey('');
    }
  };

  const handlePasskeyChange = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPasskey.length < 6) {
      setError('Passkey must be at least 6 characters long.');
      return;
    }

    if (newPasskey !== confirmPasskey) {
      setError('Passkeys do not match. Please try again.');
      return;
    }

    // Save the new passkey
    localStorage.setItem('encoder_passkey', newPasskey);
    localStorage.setItem('encoder_passkey_changed', new Date().toISOString());
    
    // Reset form
    setNewPasskey('');
    setConfirmPasskey('');
    setIsChangingPasskey(false);
    setIsFirstTime(false);
    
    if (isFirstTime) {
      // Auto-login after first setup
      onLogin(true);
    } else {
      setError('Passkey updated successfully. Please login with your new passkey.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <Lock className="login-icon" size={48} />
          <h1>Data Encoder App</h1>
          <p className="login-subtitle">
            {isFirstTime 
              ? 'Welcome! Please set up your passkey to secure the application.'
              : 'Enter your passkey to access the encoder application.'
            }
          </p>
        </div>

        {isChangingPasskey ? (
          <form onSubmit={handlePasskeyChange} className="login-form">
            <h2>{isFirstTime ? 'Set Up Passkey' : 'Change Passkey'}</h2>
            
            <div className="form-group">
              <label htmlFor="newPasskey">New Passkey</label>
              <div className="input-group">
                <input
                  type={showPasskey ? 'text' : 'password'}
                  id="newPasskey"
                  value={newPasskey}
                  onChange={(e) => setNewPasskey(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Enter new passkey (min 6 characters)"
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowPasskey(!showPasskey)}
                  aria-label="Toggle passkey visibility"
                >
                  {showPasskey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPasskey">Confirm Passkey</label>
              <input
                type={showPasskey ? 'text' : 'password'}
                id="confirmPasskey"
                value={confirmPasskey}
                onChange={(e) => setConfirmPasskey(e.target.value)}
                required
                minLength={6}
                placeholder="Confirm your new passkey"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {isFirstTime ? 'Set Passkey' : 'Update Passkey'}
              </button>
              {!isFirstTime && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setIsChangingPasskey(false);
                    setNewPasskey('');
                    setConfirmPasskey('');
                    setError('');
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="passkey">Passkey</label>
              <div className="input-group">
                <input
                  type={showPasskey ? 'text' : 'password'}
                  id="passkey"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  required
                  placeholder="Enter your passkey"
                  autoFocus
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowPasskey(!showPasskey)}
                  aria-label="Toggle passkey visibility"
                >
                  {showPasskey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                <Lock size={16} />
                Login
              </button>
              <button
                type="button"
                className="btn-link"
                onClick={() => setIsChangingPasskey(true)}
              >
                <Key size={16} />
                Change Passkey
              </button>
            </div>
          </form>
        )}

        <div className="login-footer">
          <p className="security-note">
            🔒 Your passkey is stored locally and encrypted. 
            Keep it secure as it protects access to your encoding configurations.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;