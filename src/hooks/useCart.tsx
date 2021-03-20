import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';
import { formatPrice } from './../util/format';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface ProductFormatted extends Product {
  priceFormatted: string;
}

interface ProductProps {
  id: number;
  title: string;
  price: number;
  priceFormatted: string;
  image: string;
}

interface CartContextData {
  products: ProductProps[];
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;

}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [products, setProducts] = useState<ProductFormatted[]>([]);

  useEffect(() => {
    async function loadProducts() {
      const response = await api.get<Product[]>('products');

      const productsFormatted = response.data.map(product => ({
          ...product,
          priceFormatted: formatPrice(product.price)
      }))

      setProducts(productsFormatted);
    }

    loadProducts();
  }, []);

  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart  = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try { 
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
      const { data: product } = await api.get<Product>(`/products/${productId}`);

      const cartIndex = cart.findIndex((cart) => cart.id === productId);
      if (cartIndex === -1) {
        if (stock.amount > 0) {
          const newCart = [...cart, { ...product, amount: 1 }];
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...newCart]));
          setCart([...newCart]);
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      } else {
        updateProductAmount({ productId, amount: cart[cartIndex].amount + 1 });
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const newCart = cart.filter((cart) => cart.id !== productId);
      setCart([...newCart]);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify([...newCart]));
      
    } catch {
      // TODO
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0)
        throw new Error('Erro na alteração de quantidade do produto');

      const { data: productOnStock } = await api.get<Stock>(`stock/${productId}`);

      if (productOnStock) {
        //should not be able to increase a product amount when running out of stock
        if (amount > productOnStock.amount)
          throw new Error('Quantidade solicitada fora de estoque');

        const productOnCart = cart.find((product) => product.id === productId);

        if (productOnCart) {
          productOnCart.amount = amount;

          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart]));
          setCart([...cart]);
        }
      } else throw new Error('Erro na alteração de quantidade do produto');
    } catch {
      toast.error('Não existe saldo para adição');
    }
  };

  return (
    <CartContext.Provider
      value={{ products, cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
