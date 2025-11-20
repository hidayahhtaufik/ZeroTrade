import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('should validate required fields', async () => {
    render(
      <CreateListing
        contract={mockContract}
        fhevmInstance={mockFhevmInstance}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const submitButton = screen.getByText(/List for Sale/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Please fill in all required fields/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should validate positive FDV', async () => {
    render(
      <CreateListing
        contract={mockContract}
        fhevmInstance={mockFhevmInstance}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Fill required fields with invalid FDV
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/Token Symbol/i), { target: { value: 'TEST' } });
    fireEvent.change(screen.getByLabelText(/Fully Diluted Valuation/i), { target: { value: '-100' } });
    fireEvent.change(screen.getByLabelText(/Tranche Size/i), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText(/Minimum Price per Token/i), { target: { value: '0.001' } });

    const submitButton = screen.getByText(/List for Sale/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid FDV/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should validate vesting months for vesting deal type', async () => {
    render(
      <CreateListing
        contract={mockContract}
        fhevmInstance={mockFhevmInstance}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Select vesting deal type
    const dealTypeSelect = screen.getByLabelText(/Deal Type/i);
    fireEvent.change(dealTypeSelect, { target: { value: '1' } });

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/Token Symbol/i), { target: { value: 'TEST' } });
    fireEvent.change(screen.getByLabelText(/Fully Diluted Valuation/i), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText(/Tranche Size/i), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText(/Minimum Price per Token/i), { target: { value: '0.001' } });
    fireEvent.change(screen.getByLabelText(/Vesting Duration/i), { target: { value: '100' } });

    const submitButton = screen.getByText(/List for Sale/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Vesting months must be between 1 and 60/i)).toBeInTheDocument();
    }, { timeout: 3000 });
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

    // Initially no vesting input (default is SPOT)
    expect(screen.queryByLabelText(/Vesting Duration/i)).not.toBeInTheDocument();

    // Select vesting deal type
    const dealTypeSelect = screen.getByLabelText(/Deal Type/i);
    fireEvent.change(dealTypeSelect, { target: { value: '1' } });

    // Now vesting input should appear
    expect(screen.getByLabelText(/Vesting Duration/i)).toBeInTheDocument();
  });

  it('should handle image upload successfully', async () => {
    render(
      <CreateListing
        contract={mockContract}
        fhevmInstance={mockFhevmInstance}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/Upload Image/i);

    Object.defineProperty(fileInput, 'files', {
      value: [file]
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      const preview = screen.getByAlt('Preview');
      expect(preview).toBeInTheDocument();
    });
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

    // Create a mock file larger than 2MB
    const largeFile = new File(['x'.repeat(3 * 1024 * 1024)], 'large.png', { type: 'image/png' });
    Object.defineProperty(largeFile, 'size', { value: 3 * 1024 * 1024 });
    
    const fileInput = screen.getByLabelText(/Upload Image/i);
    Object.defineProperty(fileInput, 'files', { value: [largeFile] });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText(/Image size must be less than 2MB/i)).toBeInTheDocument();
    });
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

    await waitFor(() => {
      expect(screen.getByText(/Please upload an image file/i)).toBeInTheDocument();
    });
  });

  it('should allow removing uploaded image', async () => {
    render(
      <CreateListing
        contract={mockContract}
        fhevmInstance={mockFhevmInstance}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const file = new File(['dummy'], 'test.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/Upload Image/i);
    
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByAlt('Preview')).toBeInTheDocument();
    });

    const removeButton = screen.getByText(/Remove/i);
    fireEvent.click(removeButton);

    expect(screen.queryByAlt('Preview')).not.toBeInTheDocument();
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
