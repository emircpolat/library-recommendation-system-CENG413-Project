import React, { useState, FormEvent, ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import { validateEmail, validatePassword, validateRequired } from '@/utils/validation';
import { handleApiError } from '@/utils/errorHandling';

/* -------------------- */
/* Types */
/* -------------------- */

type SignupStep = 'signup' | 'verification';

type ErrorState = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  code?: string;
};

type ResendStatus = {
  message: string;
  type: 'success' | 'error';
};

export function Signup() {
  const navigate = useNavigate();
  const { signup, verifyCode, resendCode } = useAuth();

  const [step, setStep] = useState<SignupStep>('signup');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const [errors, setErrors] = useState<ErrorState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<ResendStatus | null>(null);

  /* -------------------- */
  /* Validation */
  /* -------------------- */

  const validate = (): boolean => {
    const newErrors: ErrorState = {};

    if (!validateRequired(name)) newErrors.name = 'Name is required';

    if (!validateRequired(email)) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!validateRequired(password)) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(password)) {
      newErrors.password =
        'Password must be at least 8 characters with uppercase, lowercase, and number';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* -------------------- */
  /* STEP 1: SIGNUP */
  /* -------------------- */

  const handleSignupSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setResendStatus(null);

    try {
      await signup(email, password, name);
      setStep('verification');
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'name' in err &&
        (err as { name?: string }).name === 'UsernameExistsException'
      ) {
        setErrors({ email: 'User already exists. Please verify your email.' });
        setStep('verification');

        try {
          await resendCode(email);
          setResendStatus({
            message: 'A new verification code has been sent to your email.',
            type: 'success',
          });
        } catch {
          // rate limit – sessiz geçiyoruz
        }
      } else {
        handleApiError(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /* -------------------- */
  /* STEP 2: VERIFICATION */
  /* -------------------- */

  const handleVerificationSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!verificationCode) {
      setErrors({ code: 'Verification code is required' });
      return;
    }

    setIsLoading(true);

    try {
      await verifyCode(email, verificationCode);
      navigate('/login');
    } catch (err: unknown) {
      handleApiError(err);
      setErrors({ code: 'Invalid verification code' });
    } finally {
      setIsLoading(false);
    }
  };

  /* -------------------- */
  /* RESEND CODE */
  /* -------------------- */

  const handleResendCode = async () => {
    setResendStatus(null);

    try {
      await resendCode(email);
      setResendStatus({
        message: 'New code sent successfully!',
        type: 'success',
      });
    } catch {
      setResendStatus({
        message: 'Cannot send multiple emails in a short time. Please try again later.',
        type: 'error',
      });
    }
  };

  /* -------------------- */
  /* UI */
  /* -------------------- */

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 animated-bg">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold mb-3">
            {step === 'signup' ? 'Create Account' : 'Verify Email'}
          </h1>
          <p className="text-slate-600">
            {step === 'signup'
              ? 'Join us to discover your next favorite book'
              : `We sent a code to ${email}`}
          </p>
        </div>

        <div className="glass-effect rounded-3xl p-8">
          {step === 'signup' && (
            <form onSubmit={handleSignupSubmit}>
              <Input label="Full Name" value={name} onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} error={errors.name} />
              <Input label="Email" type="email" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} error={errors.email} />
              <Input label="Password" type="password" value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} error={errors.password} />
              <Input label="Confirm Password" type="password" value={confirmPassword} onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)} error={errors.confirmPassword} />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Sign Up'}
              </Button>
            </form>
          )}

          {step === 'verification' && (
            <form onSubmit={handleVerificationSubmit}>
              <Input
                label="Verification Code"
                value={verificationCode}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setVerificationCode(e.target.value)}
                error={errors.code}
              />

              {resendStatus && (
                <p className={`text-sm mt-2 ${resendStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                  {resendStatus.message}
                </p>
              )}

              <Button type="submit" className="w-full mt-4" disabled={isLoading}>
                {isLoading ? 'Verifying...' : 'Confirm Account'}
              </Button>

              <button type="button" onClick={handleResendCode} className="mt-4 text-sm text-violet-600">
                Resend Code
              </button>
            </form>
          )}

          {step === 'signup' && (
            <p className="mt-6 text-center text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-violet-600 font-semibold">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
