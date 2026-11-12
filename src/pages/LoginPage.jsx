import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import { useNotification } from '@contexts/NotificationContext';
import { 
  Page, 
  Container, 
  Card, 
  Input, 
  Button, 
  Typography, 
  Icon 
} from '@components/Components';

export const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const { login } = useAuth();
  const { error: showError, success: showSuccess } = useNotification();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Simple validation - just check if fields are filled
    if (!formData.identifier || !formData.password) {
      if (!formData.identifier) {
        showError('Email or username is required');
      } else if (!formData.password) {
        showError('Password is required');
      }
      return;
    }
    
    setIsLoading(true);

    try {
      const result = await login(twoFactorStep ? { ...formData, twoFactorToken: twoFactorToken.trim() } : formData);

      if (result.requiresTwoFactor) {
        setTwoFactorStep(true);
        return;
      }

      if (result.success) {
        showSuccess('Login successful! Welcome back.');
        navigate('/'); // Navigate to dashboard after successful login
      } else {
        showError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      showError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = twoFactorStep
    ? twoFactorToken.trim().length >= 6
    : formData.identifier && formData.password;

  return (
    <Page layout="flex" align="center" justify="center" background="dots" backgroundFade="radial">
        <Card layout="flex-column" padding="xl" align="center" gap="lg" width="100%" maxWidth="560px">
            {/* Header */}
            <Container layout="flex-column" gap="sm" align="center" padding="none">
              <Icon name={twoFactorStep ? 'FaShieldAlt' : 'FaLock'} size="lg" color="primary" />
              <Typography as="h1" size="2xl" weight="bold" font="secondary" color="primary" style={{ textAlign: 'center' }}>
                {twoFactorStep ? 'Two-Factor Authentication' : 'Sign In'}
              </Typography>
              <Typography align="center">
                Welcome back! Please sign in to your account.
              </Typography>
            </Container>

            {/* Login Form */}
              <Container
                as="form"
                style={{ width: '92%' }}
                gap="md"
                padding="none"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleSubmit(e);
                  }
                }}
                onSubmit={handleSubmit}
              >
                {twoFactorStep && (
                  <>
                    <Typography size="sm" align="center" style={{ display: 'block', textAlign: 'center', width: '100%' }}>
                      Enter the 6-digit code from your authenticator app, or a backup code.
                    </Typography>
                    <Input
                      type="text"
                      name="twoFactorToken"
                      label="Authentication code"
                      variant="floating"
                      value={twoFactorToken}
                      onChange={e => setTwoFactorToken(e.target.value)}
                      required
                      width="100%"
                      maxLength={20}
                      autoComplete="one-time-code"
                    />
                    <Button
                      type="button"
                      color="secondary"
                      width="100%"
                      onClick={() => { setTwoFactorStep(false); setTwoFactorToken(''); }}
                      disabled={isLoading}
                    >
                      Back to sign in
                    </Button>
                  </>
                )}

                {!twoFactorStep && (
                <Input
                  type="text"
                  name="identifier"
                  label="Email or Username"
                  variant="floating"
                  value={formData.identifier}
                  onChange={handleInputChange}
                  required
                  width="100%"
                  autoComplete="username"
                />
                )}

                {!twoFactorStep && (
                <Input
                  type="password"
                  name="password"
                  label="Password"
                  variant="floating"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  width="100%"
                  autoComplete="current-password"
                />
                )}

                <Button
                  type="submit"
                  color="primary"
                  disabled={!isFormValid || isLoading}
                  onClick={handleSubmit}
                  width="100%"
                >
                  {isLoading ? (
                    <>
                      <Icon name="FaSpinner" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <Icon name="FaSignInAlt" />
                      Sign In
                    </>
                  )}
                </Button>
              </Container>

            {/* Actions */}
            <Container layout="flex-column" gap="sm" align="center" padding="none">
              <Button
                color="secondary"
                size="sm"
                onClick={() => navigate('/forgot-password')}
              >
                Forgot your password?
              </Button>

              <Container layout="flex" justify="center" gap="sm">
                <Typography size="sm">
                  Don't have an account?
                </Typography>
                <Button
                  color="tertiary"
                  size="sm"
                  onClick={() => navigate('/signup')}
                >
                  Sign Up
                </Button>
              </Container>
            </Container>
        </Card>
    </Page>
  );
};

export default LoginPage;
