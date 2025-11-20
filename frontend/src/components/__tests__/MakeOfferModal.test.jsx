import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MakeOfferModal from '../MakeOfferModal';

describe('MakeOfferModal Component', () => {
  const mockListing = {
    id: 1,
    seller: '0x9999999999999999999999999999999999999999',
    title: 'Test Token Sale',
    description: 'Test description',
    category: 'Tokens',
    tokenSymbol: 'TEST',
    fdv: '1000000000000000000000',
    dealType: 4,
    trancheSize: '100000',
    status: 0
  };

  const mockContract = {
    target: '0x1111111111111111111111111111111111111111',
    makeOffer: vi.fn().mockResolvedValue({
      wait: vi.fn().mockResolvedValue({ hash: '0xabcd' })
    })
  };

  const mockFhevmInstance = {
    createEncryptedInput: vi.fn().mockReturnValue({
      add64: vi.fn(),
      encrypt: vi.fn().mockResolvedValue({
        handles: ['0xencrypted1'],
        inputProof: '0xproof1'
      })
    })
  };

  const mockAccount = '0x1234567890123456789012345678901234567890';
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal with all form fields', () => {
    render(
      <MakeOfferModal
        listing={mockListing}
        contract={mockContract}
        fhevmInstance={mockFhevmInstance}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText(/Make Private Offer/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Offer Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Your Offer Amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Desired Token Valuation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Escrow Deposit/i)).toBeInTheDocument();
  });

  it('should show all three offer type options', () => {
    render(
      <MakeOfferModal
        listing={mockListing}
        contract={mockContract}
        fhevmInstance={mockFhevmInstance}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText(/Full Tranche/i)).toBeInTheDocument();
    expect(screen.getByText(/Partial/i)).toBeInTheDocument();
    expect(screen.getByText(/Custom/i)).toBeInTheDocument();
  });

  it('should allow selecting different offer types', () => {
    render(
      <MakeOfferModal
        listing={mockListing}
        contract={mockContract}
        fhevmInstance={mockFhevmInstance}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const partialOption = screen.getByText(/Partial/i).closest('.offer-type-option');
    fireEvent.click(partialOption);
    
    expect(partialOption).toHaveClass('selected');
  });

  it('should validate required fields before submission', async () => {
    render(
      <MakeOfferModal
        listing={mockListing}
        contract={mockContract}
        fhevmInstance={mockFhevmInstance}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const submitButton = screen.getByText(/Submit Private Offer/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Please fill in all required fields/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should prevent offering on own listing', async () => {
    const ownListing = { ...mockListing, seller: mockAccount };
    
    render(
      <MakeOfferModal
        listing={ownListing}
        contract={mockContract}
        fhevmInstance={mockFhevmInstance}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Fill form
    const amountInput = screen.getByPlaceholderText(/e.g., 0.5/i);
    const valuationInput = screen.getByPlaceholderText(/e.g., 0.001/i);
    const escrowInput = screen.getByPlaceholderText(/e.g., 0.1/i);

    fireEvent.change(amountInput, { target: { value: '1' } });
    fireEvent.change(valuationInput, { target: { value: '0.001' } });
    fireEvent.change(escrowInput, { target: { value: '0.1' } });

    const submitButton = screen.getByText(/Submit Private Offer/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/cannot make an offer on your own listing/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should validate positive amounts', async () => {
    render(
      <MakeOfferModal
        listing={mockListing}
        contract={mockContract}
        fhevmInstance={mockFhevmInstance}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const amountInput = screen.getByPlaceholderText(/e.g., 0.5/i);
    const valuationInput = screen.getByPlaceholderText(/e.g., 0.001/i);
    const escrowInput = screen.getByPlaceholderText(/e.g., 0.1/i);
    
    fireEvent.change(amountInput, { target: { value: '-1' } });
    fireEvent.change(valuationInput, { target: { value: '0.001' } });
    fireEvent.change(escrowInput, { target: { value: '0.1' } });

    const submitButton = screen.getByText(/Submit Private Offer/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid offer amount/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should validate custom terms character limit', async () => {
    render(
      <MakeOfferModal
        listing={mockListing}
        contract={mockContract}
        fhevmInstance={mockFhevmInstance}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Fill required fields first
    const amountInput = screen.getByPlaceholderText(/e.g., 0.5/i);
    const valuationInput = screen.getByPlaceholderText(/e.g., 0.001/i);
    const escrowInput = screen.getByPlaceholderText(/e.g., 0.1/i);
    const customTerms = screen.getByPlaceholderText(/Add any custom negotiation/i);

    fireEvent.change(amountInput, { target: { value: '1' } });
    fireEvent.change(valuationInput, { target: { value: '0.001' } });
    fireEvent.change(escrowInput, { target: { value: '0.1' } });
    
    const longText = 'a'.repeat(501);
    fireEvent.change(customTerms, { target: { value: longText } });

    const submitButton = screen.getByText(/Submit Private Offer/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Custom terms must be 500 characters or less/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should close modal when Cancel is clicked', () => {
    render(
      <MakeOfferModal
        listing={mockListing}
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

  it('should close modal when X button is clicked', () => {
    render(
      <MakeOfferModal
        listing={mockListing}
        contract={mockContract}
        fhevmInstance={mockFhevmInstance}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should display FHE privacy protection notice', () => {
    render(
      <MakeOfferModal
        listing={mockListing}
        contract={mockContract}
        fhevmInstance={mockFhevmInstance}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText(/FHE Privacy Protection/i)).toBeInTheDocument();
    expect(screen.getByText(/Your offer amount is encrypted on-chain/i)).toBeInTheDocument();
  });
});
