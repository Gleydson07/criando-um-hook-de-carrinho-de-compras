import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart  = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const getProduct = async (productId:number)=> {
    const {data} = await api.get<Product>(`/products/${productId}`);
    
    if(!data){
      return;
    }
    return data;
  }

  const addProduct = async (productId: number) => {
    try { 
      const productCard = cart.find(product => product.id === productId);
      if(productCard){
        updateProductAmount({
          productId,
          amount: productCard.amount+1
        })
      }else{
        const data = await getProduct(productId);
        if(data){
          const newCart = [...cart, {
            ...data,
            amount: 1
          }]
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...newCart]));
          setCart(newCart);
        }
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const data = await getProduct(productId);
      if(data && productId !== data.id){
        throw Error('O Produto não existe');
      }else{
        const newCart = cart.filter((cart) => cart.id !== productId);
        setCart([...newCart]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...newCart]));
      }
    } catch {
      toast('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount
  }: UpdateProductAmount) => {
    const { data: productOnStock } = await api.get<Stock>(`stock/${productId}`);
    try {
      if ( !productOnStock || amount <= 0 || amount > productOnStock.amount){
        toast.error('Quantidade solicitada fora de estoque');
      }else{
        const productOnCart = cart.find((product) => product.id === productId);
        if (productOnCart) {
          productOnCart.amount = amount;
  
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart]));
          setCart([...cart]);
        }
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
