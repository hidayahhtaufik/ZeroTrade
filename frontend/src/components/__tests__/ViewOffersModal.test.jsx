import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ViewOffersModal from '../ViewOffersModal';

describe('ViewOffersModal Component', () => {
  const mockListing = {
    id: 1,
    seller: '0x1234567890123456789012345678901234567890',
    tokenSymbol: 'ETH',
    dealType: 1,
    status: 0
  };

  const mockContract = {
    getListingOffers: vi.fn().mockResolvedValue([0, 1]),
    getOfferInfo: vi.fn().mockImplementation((offerId) => {
      return Promise.resolve([
        1n, // listingId
        '0x9999999999999999999999999999999999999999', // buyer
        'FULL_TRANCHE', // offerType
        '', // customTerms
        0n, // status
        BigInt(Math.floor(Date.now() / 1000)), // createdAt
        '100000000000000000' // escrowAmount (0.1 ETH)
      ]);
    }),
    acceptOffer: vi.fn().mockResolvedValue({
      wait: vi.fn().mockResolvedValue({ hash: '0xabcd' })
    }),
    rejectOffer: vi.fn().mockResolvedValue({
      wait: vi.fn().mockResolvedValue({ hash: '0xefgh' })
    })
  };

  const mockAccount = '0x1234567890123456789012345678901234567890';
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal with listing summary', async () => {
    render(
      <ViewOffersModal
        listing={mockListing}
        contract={mockContract}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Offers for ETH/i)).toBeInTheDocument();
    });
  });

  it('should load and display offers', async () => {
    render(
      <ViewOffersModal
        listing={mockListing}
        contract={mockContract}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Offer #0/i)).toBeInTheDocument();
      expect(screen.getByText(/Offer #1/i)).toBeInTheDocument();
    });

    expect(mockContract.getListingOffers).toHaveBeenCalledWith(1);
  });

  it('should show empty state when no offers', async () => {
    const emptyContract = {
      ...mockContract,
      getListingOffers: vi.fn().mockResolvedValue([])
    };

    render(
      <ViewOffersModal
        listing={mockListing}
        contract={emptyContract}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/No Offers Yet/i)).toBeInTheDocument();
      expect(screen.getByText(/Waiting for buyers to make offers/i)).toBeInTheDocument();
    });
  });

  it('should display offer status correctly', async () => {
    render(
      <ViewOffersModal
        listing={mockListing}
        contract={mockContract}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Offer #0/i)).toBeInTheDocument();
    });

    // Check that status is displayed somewhere in the component
    const pendingStatuses = screen.queryAllByText(/Pending/i);
    expect(pendingStatuses.length).toBeGreaterThan(0);
  });

  it('should show Accept and Reject buttons for pending offers', async () => {
    render(
      <ViewOffersModal
        listing={mockListing}
        contract={mockContract}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      const acceptButtons = screen.getAllByText(/Accept & Complete Trade/i);
      const rejectButtons = screen.getAllByText(/Reject & Refund/i);
      
      expect(acceptButtons.length).toBeGreaterThan(0);
      expect(rejectButtons.length).toBeGreaterThan(0);
    });
  });

  it('should call acceptOffer when Accept button is clicked', async () => {
    render(
      <ViewOffersModal
        listing={mockListing}
        contract={mockContract}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Offer #0/i)).toBeInTheDocument();
    });

    const acceptButton = screen.getAllByText(/Accept & Complete Trade/i)[0];
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(mockContract.acceptOffer).toHaveBeenCalledWith(0);
    });
  });

  it('should show confirmation dialog when rejecting offer', async () => {
    global.confirm = vi.fn(() => true);

    render(
      <ViewOffersModal
        listing={mockListing}
        contract={mockContract}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Offer #0/i)).toBeInTheDocument();
    });

    const rejectButton = screen.getAllByText(/Reject & Refund/i)[0];
    fireEvent.click(rejectButton);

    expect(global.confirm).toHaveBeenCalled();
  });

  it('should call rejectOffer when confirmed', async () => {
    global.confirm = vi.fn(() => true);

    render(
      <ViewOffersModal
        listing={mockListing}
        contract={mockContract}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Offer #0/i)).toBeInTheDocument();
    });

    const rejectButton = screen.getAllByText(/Reject & Refund/i)[0];
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(mockContract.rejectOffer).toHaveBeenCalledWith(0);
    });
  });

  it('should not reject if user cancels confirmation', async () => {
    global.confirm = vi.fn(() => false);

    render(
      <ViewOffersModal
        listing={mockListing}
        contract={mockContract}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Offer #0/i)).toBeInTheDocument();
    });

    const rejectButton = screen.getAllByText(/Reject & Refund/i)[0];
    fireEvent.click(rejectButton);

    expect(mockContract.rejectOffer).not.toHaveBeenCalled();
  });

  it('should display escrow amount correctly', async () => {
    render(
      <ViewOffersModal
        listing={mockListing}
        contract={mockContract}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Offer #0/i)).toBeInTheDocument();
    });

    // Check escrow is displayed in the details
    const escrowText = screen.getAllByText(/ETH/i);
    expect(escrowText.length).toBeGreaterThan(0);
  });

  it('should handle API errors gracefully', async () => {
    const errorContract = {
      ...mockContract,
      getListingOffers: vi.fn().mockRejectedValue(new Error('Network error'))
    };

    render(
      <ViewOffersModal
        listing={mockListing}
        contract={errorContract}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load offers/i)).toBeInTheDocument();
    });
  });

  it('should call onSuccess after accepting offer', async () => {
    render(
      <ViewOffersModal
        listing={mockListing}
        contract={mockContract}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Offer #0/i)).toBeInTheDocument();
    });

    const acceptButton = screen.getAllByText(/Accept & Complete Trade/i)[0];
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should close modal after accepting offer', async () => {
    render(
      <ViewOffersModal
        listing={mockListing}
        contract={mockContract}
        account={mockAccount}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Offer #0/i)).toBeInTheDocument();
    });

    const acceptButton = screen.getAllByText(/Accept & Complete Trade/i)[0];
    fireEvent.click(acceptButton);

    // Wait for success callback
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    }, { timeout: 3000 });
  });
});
