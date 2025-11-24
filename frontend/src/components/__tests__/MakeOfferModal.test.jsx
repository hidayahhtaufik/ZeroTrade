import { fireEvent, render, screen } from '@testing-library/react';
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
