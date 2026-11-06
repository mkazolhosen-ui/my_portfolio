export interface KnowledgeFact {
  category: string
  text: string
}

/** The built-in knowledge library. Used until (and whenever) the database version is unavailable. */
export const fallbackFacts: readonly KnowledgeFact[] = [
  // AI
  { category: 'AI', text: 'Large language models predict the next token. Fluent text is not the same as verified truth.' },
  { category: 'AI', text: 'Prompt injection hides instructions inside content an AI was only meant to read, hoping it obeys them.' },
  { category: 'AI', text: 'Training data shapes a model’s behaviour, so biased or poisoned data can quietly skew its answers.' },
  { category: 'AI', text: 'Retrieval-augmented generation lets a model look up documents before answering, which can reduce made-up facts.' },
  { category: 'AI', text: 'An AI hallucination is a confident answer that is simply wrong, so important claims still need checking.' },

  // Machine learning
  { category: 'Machine learning', text: 'Overfitting means a model memorised its training data and then performs poorly on new data.' },
  { category: 'Machine learning', text: 'Train, validation and test splits keep a final score honest, because the test set is never used for tuning.' },
  { category: 'Machine learning', text: 'Precision asks how many flagged items were truly positive. Recall asks how many positives were found.' },
  { category: 'Machine learning', text: 'Gradient descent improves a model by repeatedly nudging its parameters to reduce the error.' },
  { category: 'Machine learning', text: 'Data leakage happens when test information sneaks into training, making results look better than they are.' },

  // Neural networks
  { category: 'Neural networks', text: 'A neuron weighs its inputs, adds them up, and passes the result through an activation function.' },
  { category: 'Neural networks', text: 'Without non-linear activation functions, stacking layers would still behave like a single linear layer.' },
  { category: 'Neural networks', text: 'Backpropagation uses the chain rule to work out how each weight contributed to the error.' },
  { category: 'Neural networks', text: 'Convolutional networks reuse small filters across an image, which suits patterns like edges and textures.' },
  { category: 'Neural networks', text: 'Dropout randomly switches off neurons during training, which helps reduce overfitting.' },

  // Cybersecurity
  { category: 'Cybersecurity', text: 'Passwords should be stored as salted hashes, not encrypted, so a leaked database reveals far less.' },
  { category: 'Cybersecurity', text: 'The CIA triad is confidentiality, integrity and availability, the three goals most security controls serve.' },
  { category: 'Cybersecurity', text: 'Multi-factor authentication makes a stolen password far less useful on its own.' },
  { category: 'Cybersecurity', text: 'Least privilege means giving every account and program only the access it needs, and nothing more.' },
  { category: 'Cybersecurity', text: 'Phishing targets people rather than software, so training and reporting habits matter as much as filters.' },

  // Ethical hacking
  { category: 'Ethical hacking', text: 'Ethical hackers test only with written permission and a clearly defined scope.' },
  { category: 'Ethical hacking', text: 'A penetration test ends with a report: what was found, how serious it is, and how to fix it.' },
  { category: 'Ethical hacking', text: 'Responsible disclosure means telling the owner about a flaw privately and giving them time to fix it first.' },
  { category: 'Ethical hacking', text: 'Tests usually move from reconnaissance to scanning to controlled testing to reporting, inside the agreed scope.' },
  { category: 'Ethical hacking', text: 'Bug bounty programs publish rules of engagement, and following them protects both the researcher and the company.' },

  // Web development
  { category: 'Web development', text: 'HTTPS wraps HTTP in TLS, so traffic is encrypted and the server’s identity can be verified.' },
  { category: 'Web development', text: 'Cross-site scripting happens when untrusted input is rendered as code, so escape output by default.' },
  { category: 'Web development', text: 'CORS is a browser rule about which sites may read another site’s responses, not a server firewall.' },
  { category: 'Web development', text: 'Responsive design uses flexible layouts and media queries so one page works on any screen size.' },
  { category: 'Web development', text: 'Semantic HTML such as nav, main and button gives assistive technology structure for free.' },

  // Python
  { category: 'Python', text: 'Lists can change after creation, tuples cannot, which is why tuples of simple values can be dictionary keys.' },
  { category: 'Python', text: 'The with statement guarantees cleanup, like closing a file, even when an error occurs.' },
  { category: 'Python', text: 'A list comprehension builds a new list from a loop in a single readable line.' },
  { category: 'Python', text: 'Python passes object references, so changing a mutable argument inside a function changes the original.' },
  { category: 'Python', text: 'A generator yields values one at a time, so it can handle huge sequences without holding them all in memory.' },

  // Data structures
  { category: 'Data structures', text: 'A stack is last-in, first-out. A queue is first-in, first-out.' },
  { category: 'Data structures', text: 'A hash table finds items in constant time on average, but many collisions can slow it down.' },
  { category: 'Data structures', text: 'Binary search needs sorted data and halves the search range each step, so it takes logarithmic time.' },
  { category: 'Data structures', text: 'A linked list inserts quickly at a known position but needs a walk to reach the middle.' },
  { category: 'Data structures', text: 'A balanced binary search tree keeps lookups, inserts and deletes in logarithmic time.' },

  // Cryptography
  { category: 'Cryptography', text: 'Symmetric encryption uses one shared key, asymmetric uses a public and private pair. Real systems combine both.' },
  { category: 'Cryptography', text: 'Never invent your own cryptography. Use well-reviewed libraries and standard algorithms.' },
  { category: 'Cryptography', text: 'A digital signature proves who made a message and that it was not changed along the way.' },

  // Networking
  { category: 'Networking', text: 'DNS translates domain names into IP addresses, so tampering with it can send people to the wrong server.' },
  { category: 'Networking', text: 'TCP guarantees ordered, reliable delivery. UDP trades that guarantee for speed and low overhead.' },
  { category: 'Networking', text: 'A firewall filters traffic by rules, but it is one layer of defence, not a complete one.' },
]