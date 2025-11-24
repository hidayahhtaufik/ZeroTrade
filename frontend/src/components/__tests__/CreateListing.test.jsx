import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreateListing from '../CreateListing';

describe('CreateListing Component', () => {
  const mockContract = {
    target: '0x1111111111111111111111111111111111111111',
    createListing: vi.fn().mockResolvedValue({
      wait: vi.fn().mockResolvedValue({ hash: '0xabcd' })
    })
  };

  const mockFhevmInstance = {
    createEncryptedInput: vi.fn().mockReturnValue({
      add64: vi.fn(),
      encrypt: vi.fn().mockResolvedValue({
        handles: ['0xencrypted'],
        inputProof: '0xproof'
      })
    })
  };

  const mockAccount = '0x1234567890123456789012345678901234567890';
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render form with all required fields', () => {
    render(
      <CreateListing
        contract={mockContract}
        fhevmInstance={mockFhevmInstance}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText(/Sell Your Item/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Token Symbol/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fully Diluted Valuation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tranche Size/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Deal Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Minimum Price per Token/i)).toBeInTheDocument();
  });

  it('should show vesting input only for vesting deal type', () => {
    render(
      <CreateListing
        contract={mockContract}
        fhevmInstance={mockFhevmInstance}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByLabelText(/Vesting Duration/i)).not.toBeInTheDocument();

    const dealTypeSelect = screen.getByLabelText(/Deal Type/i);
    fireEvent.change(dealTypeSelect, { target: { value: '1' } });

    expect(screen.getByLabelText(/Vesting Duration/i)).toBeInTheDocument();
  });

  it('should reject files larger than 2MB', async () => {
    render(
      <CreateListing
        contract={mockContract}
        fhevmInstance={mockFhevmInstance}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const largeFile = new File(['x'.repeat(3 * 1024 * 1024)], 'large.png', { type: 'image/png' });
    Object.defineProperty(largeFile, 'size', { value: 3 * 1024 * 1024 });

    const fileInput = screen.getByLabelText(/Upload Image/i);
    Object.defineProperty(fileInput, 'files', { value: [largeFile] });

    fireEvent.change(fileInput);

    const error = await screen.findByText(/Image size must be less than 2MB/i);
    expect(error).toBeInTheDocument();
  });

  it('should reject non-image files', async () => {
    render(
      <CreateListing
        contract={mockContract}
        fhevmInstance={mockFhevmInstance}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const txtFile = new File(['text'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/Upload Image/i);

    Object.defineProperty(fileInput, 'files', { value: [txtFile] });
    fireEvent.change(fileInput);

    const error = await screen.findByText(/Please upload an image file/i);
    expect(error).toBeInTheDocument();
  });

  it('should close modal when Cancel is clicked', () => {
    render(
      <CreateListing
        contract={mockContract}
        fhevmInstance={mockFhevmInstance}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should display privacy notice', () => {
    render(
      <CreateListing
        contract={mockContract}
        fhevmInstance={mockFhevmInstance}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText(/Privacy Protected/i)).toBeInTheDocument();
    expect(screen.getByText(/Your price is encrypted using FHE/i)).toBeInTheDocument();
  });
});
