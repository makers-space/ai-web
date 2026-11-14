import React, { useState } from 'react';
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
    Icon,
    Select
} from '@components/Components';

export const SignupPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        roles: ['USER']
    });
    const [isLoading, setIsLoading] = useState(false);
    const { signup } = useAuth();
    const { error: showError, success: showSuccess } = useNotification();

    const roleOptions = [
        { value: 'USER', label: 'User' },
        { value: 'CREATOR', label: 'Creator' },
        { value: 'ADMIN', label: 'Admin' },
        { value: 'OWNER', label: 'Owner' }
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleRoleChange = (selectedValue) => {
        setFormData(prev => ({
            ...prev,
            roles: selectedValue || []
        }));
    };

    const validateForm = () => {
        // Check if all required fields are filled
        const requiredFields = ['firstName', 'lastName', 'username', 'email', 'password', 'confirmPassword'];
        
        for (const field of requiredFields) {
            if (!formData[field]) {
                showError(`Please fill in all required fields`);
                return false;
            }
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);

        try {
            const signupData = { ...formData };
            delete signupData.confirmPassword;

            const result = await signup(signupData);
            
            if (result.success) {
                navigate('/'); // Navigate to dashboard after successful signup
            } else {
                showError(result.error || 'Signup failed. Please try again.');
            }
        } catch {
        } finally {
            setIsLoading(false);
        }
    };

    const isFormValid =
        formData.firstName &&
        formData.lastName &&
        formData.username &&
        formData.email &&
        formData.password &&
        formData.confirmPassword;

    return (
        <Page layout="flex" align="center" justify="center" background="dots" backgroundFade="radial">
                <Card layout="flex-column" gap="none" align="center">
                        {/* Header */}
                        <Container layout="flex-column" gap="sm" align="center">
                            <Icon name="FaUserPlus" size="lg" color="primary"/>
                            <Typography as="h1" size="2xl" weight="bold" font="secondary" color="primary">
                                Create Account
                            </Typography>
                            <Typography color="muted">
                                Join us today! Create your account to get started.
                            </Typography>
                        </Container>

                        {/* Signup Form */}
                        <Container
                          as="form"
                          layout="flex-column"
                          gap="md"
                          align="center"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              handleSubmit(e);
                            }
                          }}
                          onSubmit={handleSubmit}
                        >
                            {/* Name Fields */}
                            <Container layout="grid" columns={2} gap="xs" padding="none">
                                <Input
                                    name="firstName"
                                    variant="floating"
                                    label="First Name"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    required
                                    icon="FaUser"
                                    autoComplete="given-name"
                                />

                                <Input
                                    type="text"
                                    name="lastName"
                                    label="Last Name"
                                    variant="floating"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    required
                                    icon="FaUser"
                                    autoComplete="family-name"
                                />

                                {/* Username and Email */}
                                <Input
                                    type="text"
                                    name="username"
                                    label="Username"
                                    variant="floating"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    required
                                    icon="FaAt"
                                    autoComplete="username"
                                />

                                <Input
                                    type="email"
                                    name="email"
                                    label="Email Address"
                                    variant="floating"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                    icon="FaEnvelope"
                                    autoComplete="email"
                                />
                            </Container>
                              {/* Role Selection */}
                            <Select
                                name="roles"
                                label="Account Type"
                                multiSelect={true}
                                options={roleOptions}
                                value={formData.roles}
                                onChange={handleRoleChange}
                                required
                                width="75%"
                            />

                            {/* Password Fields */}
                            <Container layout="flex" gap="xs" padding="none">
                            <Input
                                type="password"
                                name="password"
                                label="Password"
                                variant="floating"
                                value={formData.password}
                                onChange={handleInputChange}
                                required
                                icon="FaLock"
                                autoComplete="new-password"
                            />

                            <Input
                                type="password"
                                name="confirmPassword"
                                label="Confirm Password"
                                variant="floating"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                required
                                icon="FaLock"
                                confirmField={formData.password}
                                autoComplete="new-password"
                            />
                            </Container>

                            <Button
                                type="submit"
                                color="primary"
                                disabled={!isFormValid || isLoading}
                                onClick={handleSubmit}
                                width="75%"
                            >
                                {isLoading ? (
                                    <>
                                        <Icon name="FaSpinner"/>
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        <Icon name="FaUserPlus"/>
                                        Create Account
                                    </>
                                )}
                            </Button>
                        </Container>

                        {/* Switch to Login */}
                        <Container layout="flex" justify="center" gap="sm">
                            <Typography size="sm">
                                Already have an account?
                            </Typography>
                            <Button
                                color="tertiary"
                                size="sm"
                                onClick={() => navigate('/login')}
                            >
                                <Icon name="FaSignInAlt"/>
                                Sign In
                            </Button>
                        </Container>
                </Card>
        </Page>
    );
};

export default SignupPage;
