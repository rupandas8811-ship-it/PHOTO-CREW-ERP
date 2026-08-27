import React, { useState } from 'react';

const ProductionModule = () => {
  const previewProofModal = { imageUrl: '' };
  
  return (
    <div>
      <div>
        <div>
      {/* PREVIEW PROOF IMAGE MODAL */}
      {previewProofModal && (
        <div>
          <div>
            <div>
              <div>
                <span>
                  Customer Communication Proof
                </span>
                <h3>
                  heading
                </h3>
              </div>
              <div>
                <a>
                  <span>Open Full</span>
                </a>
                <button>
                  <X />
                </button>
              </div>
            </div>

            <div>
              <img
                src={previewProofModal.imageUrl}
              />
            </div>

            <div>
              <span>{previewProofModal.imageUrl}</span>
              <button>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

        </div>
      </div>
    </div>
  );
};

export default ProductionModule;
